import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/spacece_teacher_training");
  const User = mongoose.connection.collection("users");
  const email = "ashruba86@gmail.com";
  
  const u = await User.findOne({ email: { $regex: new RegExp("^" + email + "$", "i") } });
  if (!u) {
    console.log("User NOT found for:", email);
    const sample = await User.find({}).project({ name: 1, email: 1, role: 1, approvalStatus: 1 }).limit(20).toArray();
    console.log("Existing users in database:");
    console.log(sample);
  } else {
    console.log("USER FOUND:");
    console.log({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      approvalStatus: u.approvalStatus,
      isApproved: u.isApproved,
      active: u.active,
      hasPassword: !!u.password
    });
  }
  await mongoose.disconnect();
}

main().catch(err => console.error(err));
