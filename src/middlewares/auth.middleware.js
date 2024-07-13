import  apiError  from "../utils/apiError.js";
import  asyncHandler  from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req, _, next)=>{ // kuch jagah jaha hum res ka use ni krte hai wah ape hum esko (_) se denot kar dete hai.
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!token){
            throw new apiError(401, "Unauthorized Request");
        }
        const decodedeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,)
        const user = await User.findById(decodedeToken?._id).select(
            "-password -refreshToken"
        )
        if(!user){
            // discuss about Frontend
            throw new apiError(401, "Invalid Access Token")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Request")
    }

})