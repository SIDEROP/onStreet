import mongoose from "mongoose";

const dbConnect = async () => {
    try {
        let connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Database connected successfully ${connectionInstance?.connection?.host}`);
    } catch (error) {
        console.error("Error connecting to database:", error);
        process.exit(1);
    }
};

const dbDisconnect = async () => {
    try {
        await mongoose.disconnect();
        console.log("Database disconnected successfully");
    } catch (error) {
        console.error("Error disconnecting from database:", error);
        process.exit(1);
    }
};

export { dbConnect, dbDisconnect };