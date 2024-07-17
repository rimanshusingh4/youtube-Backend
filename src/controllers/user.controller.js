import asyncHandler from '../utils/asyncHandler.js';
import apiError from '../utils/apiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import ApiResponce from '../utils/ApiResponse.js';
import  jwt  from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken; // yaha hum userModel me refreshToken field me token ki value add kar rhe hai.
        await user.save({ validateBeforeSave: false })// data ko save kar rhe hai., ab hm save method run kar rhe hai toh jitne required field hai wo sab kick in ho jayege
                    //aur password field v mangega. es liye hum validation ko off karege. {validateBeforeSave: false} use karke.
        
        return {accessToken, refreshToken} // yaha data ko hme user ko v return karna hia es liye.
    } catch (error) {
        throw new apiError(500, "Something Went wrong while generating Refresh and Access token.")
    }
}

const registerUser = asyncHandler( async (req, res)=>{ // ye hum method banaye hai aur ab ek route banayege kyuki ye method kab call hoga ye hamara route decide karega. Kyuki ek request toh aani chahiye.
    
    // Get data from frontend
    // Validate data e.g-> NO Blank data
    // Check user already Register or not
    // Check for image, Because Upload of Avatar 
    // Upload image on Cloudinary, get url of that image
    // chcek even imag eupload successfully on cloudinary or not.
    // create user Object (Because data save in mongodb in form of object) -> Create db in entry.
    // remove password and refresh token field from responce
    // checlk for user creation because something user did't create successfully.
    // return Responce otherwise return Error.

// Here we trying to get data from user(FRONTEND).......................................................................
    const {username,email,fullName,password} = req.body;
    // console.log("email",email)
    // if(fullname === ""){ // yaha pe hum ek input data ke liye check kar rhe hai, eska second approch use kar rhe hai niche.
    //     throw new apiError(400, "Fullname is required")
    // }
// yaha hum validate kr rhe hai ki input data blank na ho...............................................................
    if(
        [username, email, fullName, password].some((field)=> field?.trim() === "")
    ){
        throw new apiError(400, "all field are required");
    }
// yaha hum check kar rhe hai ki User Already exist na ho...............................................................
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if(existedUser){
        throw new apiError(409, "Already Exist with this Username or Email");
    }

    // yaha hum file handling dekhege e.g-> Avatar uploading................................................................
    // req.files hme middleware ({express multer} ke throught access mila hai.) jaisa req.body hota hai waisa hi middleware extra feature add kr dete hai.
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && (req.files.coverImage.length > 0)){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    console.log('Avatar Local Path:', avatarLocalPath);
    console.log('Cover Image Local Path:', coverImageLocalPath);

    if (!avatarLocalPath) {
        throw new apiError(400, "Profile Picture is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new apiError(400, "Profile Picture is required");
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        username: username.toLowerCase(),
        email,
        password,

    })


    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) {
        throw new apiError(500, "Server Internal Error While Registering User")
    }

    return res.status(201).json(
        new ApiResponce(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req,res)=>{
    // take data from frontend...................(email & password)
    // check username || email from data base
    // verify password
    // generate Access token and Refresh token
    // send cookies

    const {email, username, password} = req.body

    if(!(username || email)){
        throw new apiError(400, "Username or Email is required");
    }
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new apiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id) // ab yaha pe destructure krkr hm accessToken and RefreshToken dono le lenge.

    const loggedInUser = await User.findOne(user._id) // yaha hum 107 line ko firse database call kar rhe hai.
    .select("-password -refreshToken") // select kr rhe hai kon kon si field hme user ko nhi bheji hai
    
    // cookies send karne se phle kuch option design krna padta hai.
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none', 
        // ye dono ko true karne se hm esse ye cookies keval server se modify ho sakta hai aisa normally modify ni ho sakta.
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
        // yaha hum cookies se v tokens ko save kar rhe hai but sometimes user esko local machine pe save karvata hai es liye ya fir app development karta hai to waha pe cookies save ni hogi es liye hum esko aisa bhej rhe hai.
    .json(
        new ApiResponce(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User LoggedIn Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1, // clear all the token from browser
            }
        },
        {
            new: true,
        }
    )
    const options = {
        httpOnly: true,
        secure: true 
        // ye dono ko true karne se hm esse ye cookies keval server se modify ho sakta hai aisa normally modify ni ho sakta.
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponce(200, {}, "User Logout"))
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    // User se Token le rhe hai
    const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken;
    // agar token ni toh eska mtlb access wrong hai
    if(!incomingRefreshToken){
        throw new apiError(401, "Unauthorized Request");
    }
    // token mil jane ke baad, usko verify karwana padega na aur usko decode v to karna padega
    try {
        const decodedeToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN
        )
        // ab decodedetoken mil jane ke baad, databse se match karwana padega.
        const user = await User.findById(decodedeToken?._id)
        if (!user){
            throw new apiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new apiError(401, "Inavlid or Expired Token")
        }
    
        const options={
            httpOnly: true,
            secure: true,
        }
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponce(
                200,
                {accessToken, refreshToken : newRefreshToken},
                "Token Refreshed Successfully"
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Request")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findOne(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordValid){
        throw new apiError(400, "Inavlid Password")
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponce(
            200,
            {},
            "Password Change Suuccessfully"
        )
    )


})

const getCurrentUser = asyncHandler(async(req, res)=>{

    return res
    .status(200)
    .json(
        new ApiResponce(
            200,
            req.user,
            "Fetched Current user Successfully"
        )
        
    )

})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {email, fullName} = req.body

    if(!email || !fullName){
        throw new apiError(401,"fields are Required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                email: email,
                fullName: fullName
            }
        },
        {new: true}, //new: true means update ke baad value return ho jayegi.
    
    ).select("-password") 

    return res.status(200)
    .json(
        new ApiResponce(
            200,
            user,
            "Account Details Updated"
        )
    )

})

const updateUserAvatar = asyncHandler(async(req, res)=>{

    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new apiError(400,"Avatar file is missing")
    }
    const avatar = uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new apiError(400,"Error while uploading file, Avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    // TODO-> Delete old avatar image from cloudinary

    return res.status(200)
    .json(
        new ApiResponce(
            200,
            user,
            "Avatar update Successfully"
        )
    )

})
const updateUserCoverImager = asyncHandler(async(req, res)=>{


    const updateUserCoverImager = req.file?.path
    if(!updateUserCoverImager){
        throw new apiError(400,"Cover Image file is missing")
    }
    const coverImage = uploadOnCloudinary(updateUserCoverImager)
    if(!avatar){
        throw new apiError(400,"Error while uploading file, Avatar")
    }
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")
    return response.status(200)
    .json(
        new ApiResponce(
            200,
            user,
            "Cover Image Updated Successfully"
        )
    )

})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username} = req.params;
    if(!username){
        throw new apiError(400, "Username is missing");
    }

    const channel = await User.aggregate([ // sb kuch aggregate pipeline ke through krege.
        {
            $match:{ // subse phle hmne user ko match kara.
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{ // match hone k baad, subscriber count nikal liya, channel ke through.
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{ // fir same hmne kitne channel subscribe kiye hai wo nikal liya, subscription k through.
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{ // ab subscriber aur subscriberTo nikalne ke baad, usko count v to karna hai
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubsToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{ // count krne ke baad hme ye v to dikhana hai ki aap subscribe kiya hai ya nahi.
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]}, //$in dono ko le leta hai Array and Object
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                email: 1,
                subscribersCount: 1,
                channelsSubsToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])
    if(!channel?.length){
        throw new apiError(400, "Channel does not exist")
    }
    console.log("Channel Console",channel)

    return res.status(200)
    .json(
        new ApiResponce(
            200,
            channel[0],
            "User Channel fetched successfully"
        )
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{ // aggrigation use krte time hm mongodb ka id direct _id karke use ni kr sakte kyuki esme wo string form me nhi aata hai.
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id) //yaha pe hm req.body._id use kar sakte the lekin ye aggregate use ho rha hai es liya esko mongoose ke objectId ke through use krna padga
            }
        },
        {
            $lookup:{ // es lokup se hme videos ka sara document mi gaya, but owner ek khud me document hai es liye hm nested use karege.
                from: " Video",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup: { // es wale lookup se hm owner document me ghus gye.
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[ // owner field me bhi bahut data hoga hme sb toh chahiye nhi es liye hum Project ka use karke data apne accprding le lenge
                                {
                                    $project:{ // eska use karne hm wahi data select krte hai jiski hme jarurat hoti hai.
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                        // watchHistory: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$owner",
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200)
    .json(
        new ApiResponce(
            200,
            user[0].watchHistory,
            "Watch History Fetch successfully"
        )
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImager,
    getUserChannelProfile,
    getWatchHistory,

};