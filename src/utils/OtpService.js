import bcrypt from 'bcrypt';
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};


const verifyOtp = async (enteredOtp, hashedOtp) => {
    const isMatch = await bcrypt.compare(enteredOtp, hashedOtp);
    return isMatch; // true if OTPs match, false otherwise
};
export{generateOTP,verifyOtp}