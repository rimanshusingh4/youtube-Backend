import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt" // direct eska use krke encryption possible h nhi, es liye hme mongoose k (pre) hooks ki help leni padegi.

const userSchema = new Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName:{
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar:{
            type: [], // ye cloudnary ka url use karege.
            required: true,
        },
        coverImage:{
            type: String,  // ye cloudnary ka url use karege.
        },
        watchHistory:{
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        password:{
            type: String,
            required: [true, "Password is Required"]
        },
        refreshToken:{

        }
    },
    {
        timestamps:{
            type: true,
        }
    }
);

userSchema.pre("save",async function (next) { // yaha callback me hum general fn ka use kiya hai, kyuki arrow fn ke pass this. ka acess ni hota hai.
    if(!this.isModified("password")) return next(); // modified ka acess hme by default milta hai.
    
    this.password = await bcrypt.hash(this.password, 10)
    next() // es code se hm jitni bar userSchema ko use karege eg- avatar chabge ya fir username update k liya utni bar ye password o khud se --
            //-- hash kar dega aur ye ek bug/issue ho jayega es liye hum esko tabhi run karege jab passowrd add ya update hoga. is liye if condition ka use karege.
    
} );

// jaisa deleteOne, deleteMany aur v method hote hai Database me waisa hi hum apna custom metrhod v bana sakte hai. EG- 

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}


userSchema.methods.generateAccessToken = function (){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullname,
            //payload_name: database se aa rha hai.
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}

userSchema.methods.generateRefreshToken = function (){
    // refresh token database me rahega, kyuki bar bar password na lena pade user se es liye hum direct Refresh token match kara lenge.
    return jwt.sign(
        {
            _id: this._id,
            //payload_name: database se aa rha hai.
        },
        process.env.REFRESH_TOKEN,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}

export const User = mongoose.model("User", userSchema);