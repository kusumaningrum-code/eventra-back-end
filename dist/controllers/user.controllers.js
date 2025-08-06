"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const prisma_1 = require("../config/prisma");
const ResponseHandler_1 = __importDefault(require("../utils/ResponseHandler"));
const hashPassword_1 = require("../utils/hashPassword");
const jsonwebtoken_1 = require("jsonwebtoken");
const emailSender_1 = require("../utils/emailSender");
const bcrypt_1 = require("bcrypt");
const generateReferralCode_1 = require("../utils/generateReferralCode");
const point_service_1 = require("../services/point.service");
const cloudinary_1 = require("../config/cloudinary");
const discount_service_1 = require("../services/discount.service");
class UserController {
    register(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                //cek apakah email ada atau tidak
                const isExistUser = yield prisma_1.prisma.user.findUnique({
                    where: { email: req.body.email },
                });
                console.log(isExistUser);
                if (isExistUser) {
                    return ResponseHandler_1.default.error(res, `${req.body.email} is already registered. Please use another email.`, 400);
                }
                const newPassword = yield (0, hashPassword_1.hashPassword)(req.body.password);
                //Generate referral code untuk pengguna baru
                const referralCode = (0, generateReferralCode_1.generateReferralCode)();
                // cek apakah ada referral code yang digunakan
                let referredById = null;
                if (req.body.referralCode) {
                    const referralUser = yield prisma_1.prisma.user.findUnique({
                        where: { referralCode: req.body.referralCode },
                    });
                    //klo kode referralnya valid, set jadi referredById
                    if (referralUser) {
                        referredById = referralUser.id;
                        // nambahin point ke user yang punya referal (10.000 poin)
                        yield (0, point_service_1.addReferralPoints)(referralUser.id);
                    }
                }
                // buat pengguna baru
                const user = yield prisma_1.prisma.user.create({
                    data: {
                        username: req.body.username,
                        fullname: req.body.fullname,
                        email: req.body.email,
                        password: newPassword,
                        phone: req.body.phone,
                        gender: req.body.gender,
                        referralCode: referralCode,
                        referredById: referredById,
                    },
                });
                if (referredById) {
                    // // bikin kupon diskon untuk pengguna baru yang baru daftar pake referral
                    yield (0, discount_service_1.createDiscountCoupon)(user.id);
                }
                const token = (0, jsonwebtoken_1.sign)({ id: user.id, email: user.email }, process.env.TOKEN_KEY || "secret", { expiresIn: "1h" });
                yield (0, emailSender_1.sendEmail)(req.body.email, "Registration Info", "register.hbs", {
                    username: req.body.username,
                    link: `${process.env.FE_URL}/verify?a_t=${token}`,
                });
                console.log("FE_URL:", process.env.FE_URL);
                return ResponseHandler_1.default.success(res, "Your signup is success, please check your email", 201, {
                    token,
                    user,
                });
            }
            catch (error) {
                console.log(error);
                console.log("FE_URL:", process.env.FE_URL);
                return ResponseHandler_1.default.error(res, "Registration failed", error, 500);
            }
        });
    }
    signIn(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const findUser = yield prisma_1.prisma.user.findUnique({
                    where: {
                        email: req.body.email,
                    },
                });
                if (!findUser) {
                    return ResponseHandler_1.default.error(res, "Account is not exist", 404);
                }
                //Checkpassword
                const comparePass = (0, bcrypt_1.compareSync)(req.body.password, findUser.password);
                if (!comparePass) {
                    return ResponseHandler_1.default.error(res, "Password is incorrect", 400);
                }
                const token = (0, jsonwebtoken_1.sign)({ id: findUser.id, email: findUser.email }, process.env.TOKEN_KEY || "test", { expiresIn: "1h" });
                console.log("ini cek data finduser", findUser);
                return res.status(200).send({
                    id: findUser.id,
                    fullname: findUser.fullname,
                    username: findUser.username,
                    email: findUser.email,
                    role: findUser.role,
                    token,
                });
            }
            catch (error) {
                console.log(error);
                return ResponseHandler_1.default.error(res, "SignIn failed", error.rc || 500, error);
            }
        });
    }
    keepLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // data dari middleware
                console.log("at keepLogin controller", res.locals.decript);
                const findUser = yield prisma_1.prisma.user.findUnique({
                    where: { id: res.locals.decript.id },
                });
                if (!findUser) {
                    throw { rc: 404, message: "Account is not exist" };
                }
                const token = (0, jsonwebtoken_1.sign)({ id: findUser.id, email: findUser.email }, process.env.TOKEN_KEY || "test", { expiresIn: "1h" });
                return res.status(200).send({
                    id: findUser.id,
                    fullname: findUser.fullname,
                    username: findUser.username,
                    email: findUser.email,
                    role: findUser.role,
                    token,
                });
            }
            catch (error) {
                console.log(error);
                return res.status(error.rc || 500).send({
                    message: "Your keepLogin is failed",
                    success: false,
                    error: error.message,
                });
            }
        });
    }
    getUserById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.id); //dapetin id pengguna dari parameter
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                });
                if (!user) {
                    return ResponseHandler_1.default.error(res, "User not Found", 404);
                }
                return ResponseHandler_1.default.success(res, "User data fetched successfully", 200, user);
            }
            catch (error) {
                console.log(error);
                return ResponseHandler_1.default.error(res, "Failed to fetch user data", error.rc || 500, error);
            }
        });
    }
    updateProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                //Buat update data pengguna
                const updateProfile = yield prisma_1.prisma.user.update({
                    where: { id: res.locals.decript.id },
                    data: req.body,
                });
                const token = (0, jsonwebtoken_1.sign)({
                    id: updateProfile.id,
                    email: updateProfile.email,
                }, process.env.TOKEN_KEY || "test", { expiresIn: "1h" });
                return res.status(200).send({
                    id: updateProfile.id,
                    fullname: updateProfile.fullname,
                    username: updateProfile.username,
                    email: updateProfile.email,
                    phone: updateProfile.phone,
                    gender: updateProfile.gender,
                    role: updateProfile.role,
                    imgProfile: updateProfile.imgProfile,
                    token,
                });
            }
            catch (error) {
                console.log(error);
                return ResponseHandler_1.default.error(res, "Failed to update data", error.rc || 500, error);
            }
        });
    }
    // async deleteUser(req: Request, res: Response): Promise<any> {
    //   try {
    //     const userId = parseInt(req.params.id);
    //     const user = await prisma.user.findUnique({
    //       where: { id: userId },
    //     });
    //     if (!user) {
    //       return ResponseHandler.error(res, "User not Found", 404);
    //     }
    //     await prisma.user.delete({
    //       where: { id: userId },
    //     });
    //     return ResponseHandler.success(res, "User deleted successfully", 200);
    //   } catch (error: any) {
    //     console.log(error);
    //     return ResponseHandler.error(
    //       res,
    //       "Failed to delete user",
    //       error.rc || 500,
    //       error
    //     );
    //   }
    // }
    verifyUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma_1.prisma.user.update({
                    where: { id: parseInt(res.locals.decript.id) },
                    data: { isVerified: true },
                });
                ResponseHandler_1.default.success(res, "Your Account is verified", 201);
            }
            catch (error) {
                next(error);
            }
        });
    }
    updatePhotoProfile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!req.file) {
                    throw { rc: 400, message: "File is not Uploaded" };
                }
                const { secure_url } = yield (0, cloudinary_1.cloudinaryUpload)(req.file);
                console.log("RESULT FROM MEMORY", secure_url);
                const update = yield prisma_1.prisma.user.update({
                    where: { id: parseInt(res.locals.decript.id) },
                    data: { imgProfile: `/profile/${(_a = req.file) === null || _a === void 0 ? void 0 : _a.filename}` },
                });
                ResponseHandler_1.default.success(res, "Your Profile Picture has been updated", 201);
            }
            catch (error) {
                next(error);
            }
        });
    }
    forgotPassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.body;
                //ini cari user berdasarkan emailnya
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { email },
                });
                if (!user) {
                    throw { rc: 404, message: "Email is not exist" };
                }
                const resetToken = (0, jsonwebtoken_1.sign)({ userId: user.id }, process.env.TOKEN_KEY || "test", { expiresIn: "30m" });
                yield (0, emailSender_1.sendEmail)(req.body.email, "Forgot Password", "forgot.hbs", {
                    username: req.body.username,
                    link: `${process.env.FE_URL}/reset-password?a_t=${resetToken}`,
                });
                return ResponseHandler_1.default.success(res, "Check Your Email To Reset Password", 201);
            }
            catch (error) {
                return res.status(500).send({
                    message: "Check your email to Reset Passwowrd is failed",
                });
            }
        });
    }
    resetPassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newPassword = yield (0, hashPassword_1.hashPassword)(req.body.newPassword);
                const userId = parseInt(res.locals.decript.userId);
                console.log("INI DARI BE RESETPASSWORD", { newPassword, userId });
                yield prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: { password: newPassword },
                });
                return ResponseHandler_1.default.success(res, "Your New Password has been Successfully Updated", 201);
            }
            catch (error) {
                console.log(error);
                return ResponseHandler_1.default.error(res, "Reset Password Failed", 500, error);
            }
        });
    }
    getUserDiscountCoupons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = parseInt(req.params.userId);
            try {
                const discountCoupons = yield prisma_1.prisma.discountCoupon.findMany({
                    where: {
                        userId: userId,
                        expirationDate: { gte: new Date() }, // hanya yang belum expired aja
                    },
                });
                return ResponseHandler_1.default.success(res, "Successfully Get Coupon", 200, discountCoupons);
            }
            catch (error) {
                console.log(error);
                return ResponseHandler_1.default.error(res, "Failed To Fetch Data", 400);
            }
        });
    }
    getTotalPoints(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = parseInt(req.params.userId);
            try {
                const point = yield prisma_1.prisma.pointBalance.findMany({
                    where: {
                        userId: userId,
                    },
                });
                const totalPoints = point.reduce((sum, point) => sum + point.points, 0);
                console.log("ini total pointsnya", totalPoints);
                return ResponseHandler_1.default.success(res, "Success get Points", 200, totalPoints);
            }
            catch (error) {
                console.log(error);
                return ResponseHandler_1.default.error(res, "Failed to Get Total Point", 400);
            }
        });
    }
}
exports.UserController = UserController;
