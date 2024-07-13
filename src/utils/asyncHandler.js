const asyncHandler = (requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler
            (req,res,next)).catch((err)=>next(err));
    }
}

export default asyncHandler



// const asyncHandler = ()=>{} // ye ek Higher oredr fn banane ja rha hai. Means YE parameter me ek fn ko v accept kar sakta hai.
// const asyncHandler = (fn)=>{ ()=>{} } //same upar wali ko jab fn accept karvate hai aur us fn pe work karna hota hia toh hm aisa hi fn ko pass karte hai andre.
// const asyncHandler = ()=>{} // bas industry me easykarne k liye last me se curly bracket hata dete hai.



// this below fn is complete by using try catch, but somewhere it complete by using promises.
// const asyncHandler = (func)=> async (req,res,next)=>{ //jo v fn pass hua hia usme se hm req,res extract karege, next ka use es liye, kyuki hm sayad as a middleware use kare es fn ka.
//     try {
        
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

