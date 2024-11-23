import passport from '../../db/passport.js';
import crypto from 'crypto';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendEmail, sendResetEmail } from '../../utils/EmailSend.js';
import { validatePassword, validatePhoneNumber, validateRequiredFields, validateEmail ,validateOTP} from "../../utils/validation.js";
import { ApiError } from '../../utils/ApiError.js';
import { db } from "../../db/server.db.js";
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { generateOTP,verifyOtp } from '../../utils/OtpService.js';


const { User } = db;

const setSessionForUser = async (req, user) => {
    try {
        req.session.userid = user.userid;
        req.session.email = user.email;
        req.session.role = user.role;
        await req.session.save();
        return {
            userId: req.session.userid,
            email: req.session.email,
            message: "Session created successfully"
        };
    } catch (error) {
        console.error("Error during session creation:", error);
        throw new ApiError(500, "Failed to set session", error.errors);
    }
};

const PassportRegister = asyncHandler(async (req, res) => {
   
        const { email, password, role, phoneNumber } = req.body;

        const requiredFieldErrors = validateRequiredFields({ email, password, phoneNumber });
        const validationChecks = [
            { isValid: !requiredFieldErrors, error: requiredFieldErrors },
            { isValid: validateEmail(email), error: "Invalid email format." },
            { isValid: validatePassword(password), error: "Password must be at least 6 characters long, include uppercase and lowercase letters, a number, and a special character." },
            { isValid: validatePhoneNumber(phoneNumber), error: "Phone number must be in the format +91 followed by 10 digits." }
        ];

        for (const { isValid, error } of validationChecks) {
            if (!isValid) throw new ApiError(400, error);
        }

        
        const existingUser = await User.findOne({ where: { email } });
        
        if (existingUser) {
            throw new ApiError(409, "User already exists.");
        }

        const allowedRoles = ['admin', 'user']; 
        const userRole = allowedRoles.includes(role) ? role : 'user';

        // const hashedPassword = await bcrypt.hash(password, 10); 

        const otpCode = generateOTP();
        const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); 

        try {
            await sendEmail(
                email,
                "OTP Code",
                `<h2>Your OTP code is ${otpCode}</h2><p>ONLY valid for 10 minute.....</p>`
            );
        } catch (error) {
            throw new ApiError(500, "Error sending OTP email.");
        }


        const newUser = await User.create({
            userid: uuidv4(),
            email,
            password: password,
            role: userRole,
            phoneNumber,
            otpCode, 
            otpExpiration,
        });

        if (!newUser) {
            throw new ApiError(500, "Error while creating user.");
        }

        const createdUser = await User.findOne({
            where: { email },
            attributes: { exclude: ['password', 'otpCode'] }, // Exclude password and OTP from response
        });

        return res.status(201).json(
            new ApiResponse(201, createdUser, "User registered successfully. Please verify your email.")
        );
    
});



const PassportVerifyOtp=asyncHandler(async(req,res)=>{
    const { email, otp } = req.body;


    const requiredFieldErrors = validateRequiredFields({ email, otp });
    const validationChecks = [
        { isValid: !requiredFieldErrors, error: requiredFieldErrors },
        { isValid: validateEmail(email), error: "Invalid email format." },
        { isValid: validateOTP(otp), error: "Invalid OTP format. OTP must be a 6-digit number." },
    ];

    for (const { isValid, error } of validationChecks) {
        if (!isValid) throw new ApiError(400, error);
    }

   
    const user = await User.findOne({ where: { email } });
    console.log(user)

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

   
    if (user.otpVerified) {
        throw new ApiError(400, "Email is already verified.");
    }

    
    if (new Date() > new Date(user.otpExpiration)) {
        throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    let isOtpValid;
    try {
        isOtpValid = await verifyOtp(otp, user.otpCode);
    } catch (error) {
        throw new ApiError(500, "Error verifying OTP.");
    }

    if (!isOtpValid) {
        throw new ApiError(400, "Invalid OTP.");
    }

   
    user.otpCode = null;
    user.otpExpiration = null;
    user.otpVerified = true;


    user.changed("otpCode", true);
    user.changed("otpExpiration", true);
    user.changed("otpVerified", true);

    

    try{
        const updatedUser = await user.save(); 
        await user.reload();

        if (updatedUser.isVerified !== true) {
            throw new ApiError(500, "Failed to update Something went wrong.");
        }

        const responseUser = { email: user.email };
    res.status(200).json(
        new ApiResponse(200, responseUser, "Email verified successfully.")
    );

    }catch(err){
        console.error("Error during user save:", err);
        throw new ApiError(500, "A Server error occurred.");
    }
    

    
})


const resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    
    const requiredFieldErrors = validateRequiredFields({ email });
    const validationChecks = [
        { isValid: !requiredFieldErrors, error: requiredFieldErrors },
        { isValid: validateEmail(email), error: "Invalid email format." },
    ];

    for (const { isValid, error } of validationChecks) {
        if (!isValid) throw new ApiError(400, error);
    }

    
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new ApiError(404, "User not found.");
    }

   
    if (user.isVerified) {
        throw new ApiError(400, "Email is already verified.");
    }

    
    const newOtp = generateOTP(); 
    const newOtpExpiration = new Date(Date.now() + 10 * 60 * 1000); 

    try {
    
        user.set({
            otpCode: newOtp,
            otpExpiration: newOtpExpiration,
        });

        await user.save(); 

        
        await sendEmail(
            email,
            "Resend OTP Code",
            `<h2>Your new OTP code is ${newOtp}</h2><p>It is valid for 10 minutes.</p>`
        );

        
        res.status(200).json(
            new ApiResponse(
                200,
                { email },
                "A new OTP has been sent to your email address."
            )
        );
    } catch (error) {
        console.error("Error during OTP resend:", error);
        throw new ApiError(500, "An error occurred while resending the OTP.");
    }
});



const PassportLogIn = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const requiredFieldErrors = validateRequiredFields({ email, password });
    const validationChecks = [
        {
            isValid: !requiredFieldErrors,
            error: requiredFieldErrors || "Email and password are required.",
        },
        {
            isValid: validateEmail(email),
            error: "Invalid email format.",
        },
        {
            isValid: validatePassword(password),
            error: "Password must be at least 6 characters long, include uppercase and lowercase letters, a number, and a special character.",
        },
    ];

    for (const { isValid, error } of validationChecks) {
        if (!isValid) throw new ApiError(400, error);
    }

    passport.authenticate('local', async (err, user, info) => {
        console.log(user);
        if (err) {
            console.error("Error during authentication:", err);
            return next(new ApiError(500, "Authentication failed."));
        }

        if (!user) {
            return res
                .status(401)
                .json(new ApiResponse(401, {}, info?.message || "Invalid login credentials."));
        }

        try {
            const sanitizedUser = await User.findOne({
                where: { email: user.email },
                attributes: { exclude: ["password", "otpCode"] },
            });

            if (!sanitizedUser.otpVerified) {
                return res
                    .status(403)
                    .json(new ApiResponse(403, {}, "Please verify your email using OTP."));
            }

            req.login(sanitizedUser, (loginErr) => {
                if (loginErr) {
                    console.error("Error during session creation:", loginErr);
                    return next(new ApiError(500, "An error occurred during login."));
                }

                return res
                    .status(200)
                    .json(new ApiResponse(200, { user: sanitizedUser }, "Login successful."));
            });
        } catch (error) {
            console.error("Error during login process:", error);
            return next(new ApiError(500, "An internal server error occurred."));
        }
    })(req, res, next);
});



const PassportLogOut = asyncHandler(async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            throw new ApiError(500, "Failed to log out.");
        }
        res.clearCookie("connect.sid");
        return res.status(200).json(new ApiResponse(200, {}, "User logged out successfully."));
    });
});

const ForgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!validateEmail(email)) throw new ApiError(400, "Invalid email format.");

    const user = await User.findOne({ where: { email } });
    if (!user) throw new ApiError(404, "User with this email does not exist.");

    const resetToken = crypto.randomBytes(3).toString("hex");
    const tokenExpiration = new Date(Date.now() + 3600000);

    await user.update({ resetToken, tokenExpiration });

    const resetUrl = `${req.protocol}://${req.get('host')}/verifyEmail/${resetToken}`;
    await sendResetEmail(email, resetUrl);

    return res.status(200).json(new ApiResponse(200, {}, "Password reset email sent successfully."));
});

const ResetPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const { token } = req.params;

    if (!validatePassword(newPassword)) {
        throw new ApiError(400, "Password must be at least 6 characters long, include uppercase and lowercase letters, a number, and a special character.");
    }

    const user = await User.findOne({
        where: {
            resetToken: token,
            tokenExpiration: { [Op.gt]: new Date() }
        }
    });

    if (!user) throw new ApiError(400, "Invalid or expired reset token.");

    const updatedUser = await user.update({
        password: newPassword,  
        resetToken: null,
        tokenExpiration: null
    });

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});


export { PassportRegister, PassportLogIn,PassportVerifyOtp,resendOtp, PassportLogOut, ForgotPassword, ResetPassword };