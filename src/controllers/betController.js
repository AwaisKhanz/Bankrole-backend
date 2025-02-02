const Bet = require("../models/Bet");
const User = require("../models/User");
const Bankroll = require("../models/Bankroll");
const imagekit = require("../config/imagekit");

exports.getBets = async (req, res) => {
  try {
    const { bankrollId } = req.params;
    const bets = await Bet.find({ bankrollId, userId: req.user._id });
    res.status(200).json(bets);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.addBet = async (req, res) => {
  try {
    const { bankrollId, ...betData } = req.body;
    let imageUrl;

    if (req.file) {
      const folderPath = `/users/${req.user._id}/bets/verification`;

      const uploadResponse = await imagekit
        .upload({
          file: req.file.buffer,
          fileName: `verification-${Date.now()}.jpg`,
          folder: folderPath,
        })
        .catch((err) => {
          console.log(err, "imageerror");
        });

      imageUrl = uploadResponse.url;
      imageFileId = uploadResponse.fileId;
    }

    const newBet = await Bet.create({
      ...betData,
      bankrollId,
      userId: req.user._id,
      verificationImageUrl: imageUrl,
    });

    await Bankroll.findByIdAndUpdate(bankrollId, {
      $push: { bets: newBet._id },
    });

    res.status(201).json({ message: "Bet created successfully", bet: newBet });
  } catch (error) {
    console.error("Error in addBet:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateBet = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBet = await Bet.findOne({ _id: id, userId: req.user._id });
    if (!existingBet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    const updateData = { ...req.body };

    // ✅ Set verificationStatus to "Pending" if status is changed
    if (req.body.status && req.body.status !== existingBet.status) {
      updateData.verificationStatus = "Pending";
    }

    if (req.file) {
      if (existingBet.verificationImageFileId) {
        try {
          await imagekit.deleteFile(existingBet.verificationImageFileId);
          console.log("Previous verification image deleted.");
        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError.message);
        }
      }

      const folderPath = `/users/${req.user._id}/bets/verification`;

      const uploadResponse = await imagekit.upload({
        file: req.file.buffer,
        fileName: `verification-${Date.now()}.jpg`,
        folder: folderPath,
      });

      updateData.verificationImageUrl = uploadResponse.url;
      updateData.verificationImageFileId = uploadResponse.fileId;
      updateData.verificationStatus = "Pending";
    }

    const updatedBet = await Bet.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Bet updated successfully", bet: updatedBet });
  } catch (error) {
    console.error("Error in updateBet:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteBet = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the bet first to access the image file ID
    const bet = await Bet.findOne({ _id: id, userId: req.user._id });

    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    if (bet.verificationImageFileId) {
      await imagekit.deleteFile(bet.verificationImageFileId);
    }

    await Bet.findOneAndDelete({ _id: id, userId: req.user._id });

    res.status(200).json({ message: "Bet and its image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteBet:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllBetsForAdmin = async (req, res) => {
  try {
    const { search = "", limit = 10, page = 1, verificationStatus } = req.query;

    const pageSize = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const query = {
      ...(search && {
        $or: [
          { sport: { $regex: search, $options: "i" } },
          { label: { $regex: search, $options: "i" } },
        ],
      }),
      ...(verificationStatus && { verificationStatus }),
    };

    const totalBets = await Bet.countDocuments(query);

    const bets = await Bet.find(query)
      .populate("userId", "username email")
      .populate({
        path: "bankrollId",
        select: "name startingCapital currency visibility",
        match: { visibility: "Public" },
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    const publicBets = bets.filter((bet) => bet.bankrollId !== null);

    res.status(200).json({
      bets: publicBets,
      totalBets,
      totalPages: Math.ceil(totalBets / pageSize),
      currentPage,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.approveBet = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await Bet.findById(id);

    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    bet.isVerified = true;
    bet.verificationStatus = "Accepted";
    await bet.save();

    res.status(200).json({ message: "Bet approved successfully", bet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.rejectBet = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await Bet.findById(id);

    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    bet.isVerified = false;
    bet.verificationStatus = "Rejected";
    await bet.save();

    res.status(200).json({ message: "Bet rejected successfully", bet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
