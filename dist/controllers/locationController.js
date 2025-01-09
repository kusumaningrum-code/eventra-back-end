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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationController = void 0;
const prisma_1 = require("../config/prisma");
class LocationController {
    addLocationDetail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { province, city, district } = req.body;
            try {
                const locationDetail = yield prisma_1.prisma.locationDetail.create({
                    data: {
                        province,
                        city,
                        district,
                    },
                });
                res.status(201).json(locationDetail);
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ error: "Failed to create location detail" });
            }
        });
    }
}
exports.LocationController = LocationController;
