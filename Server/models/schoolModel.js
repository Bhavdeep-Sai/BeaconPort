const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    schoolName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    ownerName: { type: String, required: true },
    schoolImg: { type: String, required: true }, 
    schoolImgPublicId: { type: String }, 
    password: { type: String, required: true },
        
    isOAuthUser: { type: Boolean, default: false },
    oauthProvider: { 
        type: String, 
        enum: ['google', null], 
        default: null 
    },
    oauthId: { type: String, default: null },
        
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    feeFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'half-yearly', 'annual'],
        default: 'half-yearly',
    },

    createdAt: { type: Date, default: new Date() }
});

schoolSchema.index({ email: 1, oauthProvider: 1 });
schoolSchema.index({ resetPasswordToken: 1 });

module.exports = mongoose.model("School", schoolSchema);