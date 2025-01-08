import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import StreetVendor from '../models/StreetVendor.model.js';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Register a new user
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password,role="user" } = req.body;
  console.log(req.body)

  if ([name, email, password].some((field) => !field || field.trim() === '')) {
    res.status(400).json(new ApiError(400, 'Email and password are required'))
    throw new ApiError(400, 'All fields are required');
  }

  const existingUser = await User.findOne({ email });
  const existingVendor = await StreetVendor.findOne({ email });
  const existingUserWithPhone = await User.findOne({ phone });  
  const existingVendorWithPhone = await StreetVendor.findOne({ phone });

  if (existingUser || existingVendor || existingUserWithPhone || existingVendorWithPhone) {
    res.status(400).json(new ApiError(400, 'User already exists'));
    throw new ApiError(400, 'User already exists');
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role
  })
  const createdUser = await User.findById(user._id).select('-password');

  if (!createdUser) {
    res.status(500).json(new ApiError(500, 'Something went wrong while registering the user'));
    throw new ApiError(500, 'Something went wrong while registering the user');
  }
  const accessToken = user.generateToken();

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(201).json(new ApiResponse(201, {user:createdUser,accessToken}, 'User registered successfully'));
});

// Update user
export const updateUser = asyncHandler(async (req, res) => {

  const { name, phone, address, email } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (email) {
    const existingUser = await User.findOne({ email });
    const existingVendor = await StreetVendor.findOne({ email });
    if ((existingUser && existingUser._id.toString() !== user._id.toString()) || existingVendor) {
      throw new ApiError(400, 'Email already in use');
    }
    user.email = email;
  }

  if (phone) {
    const existingUserWithPhone = await User.findOne({ phone });
    const existingVendorWithPhone = await StreetVendor.findOne({ phone });
    if ((existingUserWithPhone && existingUserWithPhone._id.toString() !== user._id.toString()) || existingVendorWithPhone) {
      throw new ApiError(400, 'Phone number already in use');
    }
  }

  if (phone) {
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(phone)) {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian phone number');
    }
    user.phone = phone;
  }

  if (name) user.name = name;
  if (address) user.address = address;

  await user.save();

  const updatedUser = await User.findById(user._id).select('-password');

  return res.status(200).json(
    new ApiResponse(200, updatedUser, 'User updated successfully')
  );
});



// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json(new ApiError(400, 'Email and password are required'))
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');
  const vendor = await StreetVendor.findOne({ email }).select('+password');

  if (!user && !vendor) {
     res.status(401).json(new ApiError(401, 'Invalid email or password'))
     throw new ApiError(401, 'Invalid credentials')
  }

  if (user) {
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json(new ApiError(401, 'Invalid email or password'))
      throw new ApiError(401, 'Invalid credentials');
    }

    const accessToken = user.generateToken();
    const loggedInUser = await User.findById(user._id).select('-password');

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken
      }, 'User logged in successfully')
    );
  }

  if (vendor) {
    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json(new ApiError(401, 'Invalid credentials'))
      throw new ApiError(401, 'Invalid credentials');
    }

    const accessToken = vendor.generateToken();
    const loggedInVendor = await StreetVendor.findById(vendor._id).select('-password');

    res.cookie('accessToken', accessToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json(
      new ApiResponse(200, {
        user: loggedInVendor,
        accessToken
      }, 'Vendor logged in successfully')
    );
  }
});

// Logout user
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

// Authentication
export const authentication = asyncHandler(async (req, res) => {
  const accessToken = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);

  const user = await User.findById(decodedToken?.id).select('-password');
  const vendor = await StreetVendor.findById(decodedToken?.id).select('-password');

  if (!user && !vendor) {
    throw new ApiError(401, 'Unauthorized request');
  }


  if (user) {
    res.status(200).json(new ApiResponse(200, user, 'User authenticated successfully'));
  } else {
    res.status(200).json(new ApiResponse(200, vendor, 'Vendor authenticated successfully')); 
  }
});

// Add passport Google strategy configuration
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/v1/auth/google/callback',
      },
      async (accessToken, _, profile, done) => {
        try {
          let user = await User.findOne({ email: profile.emails[0].value });

          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              password: `google_${profile.id}`,
              googleId: profile.id,
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      },
    ),
  );
}

// Google authentication routes
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

export const googleAuthCallback = asyncHandler(async (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err || !user) {
      throw new ApiError(401, 'Google authentication failed');
    }

    const accessToken = user.generateToken();

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    res.redirect(process.env.CLIENT_URL);
  })(req, res, next);
});