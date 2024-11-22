import { Router } from 'express';
// import { otpSend, otpVerify } from '../Controllers/Auth.controllers/User.PhoneAuth.controller.js';
import { sendEmailVerification, verifyEmail } from '../Controllers/Auth.controllers/User.EmailAuth.controller.js';
import{ PassportRegister, PassportLogIn, PassportLogOut, ForgotPassword, ResetPassword, PassportVerifyOtp, resendOtp} from '../Controllers/Passport/User.PassAuth.controller.js';

const router = Router();


//using Passport
router.route('/login').post(PassportLogIn);

router.route('/otpVerify').post(PassportVerifyOtp);
router.route('/resend-otp').post(resendOtp);

router.route('/register').post(PassportRegister);
router.route('/logout').post(PassportLogOut);


// router.route('/sendOtp').post(otpSend);

router.route('/Emailverification').post(sendEmailVerification);
router.route('/verify-email/:token').get(verifyEmail);
router.route('/forgot-password-send').post(ForgotPassword)
router.route('/ReSet-Password/:token').post(ResetPassword);

export default router;
