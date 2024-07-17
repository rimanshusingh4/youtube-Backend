import apiError  from '../utils/apiError.js'
import asyncHandler  from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        console.log("requets of cookies is here ",req.cookies);
        console.log("req of header is here &",req.headers);

        const token = (req.cookies && req.cookies.accessToken) || 
        (req.header("Authorization") && req.header("Authorization").replace("Bearer ", ""));
  
        console.log("token is here from Auth middleware",token);
        if (!token) {
            throw new apiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            
            throw new apiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid access token")
    }
    
})