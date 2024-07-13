// ye error handle kar rhe hai taki frontend ko easy rahe error handle karne aur samjhne me, ye nodejs api error ka use kar rhe hai,
// nodejs api error se hm kevel error handle karte hai,
// responce ko handle karne ke liye express hai.

class apiError extends Error{
    constructor(
        statusCode,
        message= "Something went Wrong. It's not you, it's us.",
        errors= [],
        stack= "",
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success= false
        this.errors = errors

        if(stack){
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
export default apiError