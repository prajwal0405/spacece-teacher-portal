import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDb } from "./src/db.js";

async function main() {
  await connectDb();
  const User = mongoose.connection.collection("users");
  const email = "ashruba86@gmail.com";
  
  const u = await User.findOne({ email: { $regex: new RegExp("^" + email + "$", "i") } });
  if (!u) {
    console.log("User not found");
    await mongoose.disconnect();
    return;
  }

  console.log("Found user:", u.email, "role:", u.role);
  
  // Test common passwords
  const testPasswords = ["123456", "password", "password123", "divya123", "ashruba86", "12345678", "divya@123"];
  let matched = null;
  for (const pwd of testPasswords) {
    const isMatch = await bcrypt.compare(pwd, u.passwordHash);
    if (isMatch) {
      matched = pwd;
      break;
    }
  }

  if (matched) {
    console.log(`CURRENT PASSWORD FOR ${email} IS: "${matched}"`);
  } else {
    console.log(`None of common passwords matched. Resetting password for ${email}...`);
    // Set a known password like "123456" or "divya123"
    const newPassword = "123456";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await User.updateOne({ _id: u._id }, { $set: { passwordHash: hash, password: hash } });
    console.log(`SUCCESSFULLY RESET PASSWORD FOR ${email} TO: "${newPassword}"`);
  }

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
