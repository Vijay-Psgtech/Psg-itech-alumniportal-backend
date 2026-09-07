const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    readAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
