import { Router } from "express";
import {
    loginUser, 
    logoutUser, 
    registerUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImager, 
    getUserChannelProfile, 
    getWatchHistory
} from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
        
    ]),
    registerUser
)
router.route('/login').post(loginUser)
// secured Routes..........................................

router.route('/logout').post(verifyJWT, logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/change-password').post(verifyJWT, changeCurrentPassword)
router.route('/current-user').get(verifyJWT, getCurrentUser)
router.route('/update-account-credentials').patch(verifyJWT, updateAccountDetails) //.patch ka use es liye kyuki hme kuch field update karna tha.
// nhi to sara field update ho jata .post ya get se.
router.route('/avatar').patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route('/cover-image').patch(verifyJWT, upload.single("coverImage"), updateUserCoverImager)
router.route('/c/:username').get(verifyJWT, getUserChannelProfile)
router.route('/history').get(verifyJWT, getWatchHistory)

export default router;