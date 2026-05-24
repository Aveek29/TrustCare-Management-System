import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['CUSTOMER', 'CAREGIVER', 'ADMIN'], default: 'CUSTOMER' },
  location: {
    lat: Number,
    lng: Number,
    city: String
  },
  phone: String,
  avatar: String,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const caregiverProfileSchema = new mongoose.Schema({
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hourlyRate: Number,
  experienceYears: Number,
  skills: [String],
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  bio: String,
  availability: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  hours: Number,
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'REJECTED'], 
    default: 'PENDING' 
  },
  totalAmount: Number,
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'ESCROW', 'PAID_OUT', 'REFUNDED'],
    default: 'PENDING'
  },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  transactionId: String,
  amount: Number,
  status: {
    type: String,
    enum: ['ESCROW', 'RELEASED', 'REFUNDED', 'PENDING'],
    default: 'PENDING'
  },
  paymentMethod: String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: Number,
  comment: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const CaregiverProfile = mongoose.model('CaregiverProfile', caregiverProfileSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Review = mongoose.model('Review', reviewSchema);

const locations = [
  { city: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { city: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { city: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { city: 'Pune', lat: 18.5204, lng: 73.8567 },
  { city: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { city: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { city: 'Gurgaon', lat: 28.4597, lng: 77.0266 }
];

const skillsList = [
  'Elderly Care', 'Child Care', 'Medical Assistance', 'Physical Therapy',
  'Post-Surgery Care', 'Dementia Care', 'Palliative Care', 'Companionship',
  'Medication Management', 'Wound Care', 'IV Therapy', 'Rehabilitation',
  'Respiratory Care', 'Occupational Therapy', 'Speech Therapy', 'Nutritional Care'
];

const firstNames = [
  'Amit', 'Priya', 'Rajesh', 'Sunita', 'Vikram', 'Anjali', 'Sanjay', 'Meera',
  'Raj', 'Kavita', 'Deepak', 'Rani', 'Arun', 'Pooja', 'Mahesh', 'Lakshmi',
  'Suresh', 'Kamala', 'Ravi', 'Divya', 'Nitin', 'Swati', 'Vijay', 'Anita',
  'Dinesh', 'Geeta', 'Ashok', 'Usha', 'Gopal', 'Shanti', 'Harish', 'Neeta',
  'Vijay', 'Sunita', 'Ramesh', 'Padma', 'Krishna', 'Gita', 'Madhav', 'Sita',
  'Bharat', 'Sita', 'Gaurav', 'Aarti', 'Manish', 'Rita', 'Vijay', 'Sunita',
  'Rahul', 'Nikita', 'Sahil', 'Sonam', 'Vikas', 'Ritu', 'Akshay', 'Ankita'
];

const lastNames = [
  'Sharma', 'Patel', 'Singh', 'Gupta', 'Kumar', 'Verma', 'Reddy', 'Joshi',
  'Shah', 'Mehta', 'Chopra', 'Kapoor', 'Malhotra', 'Khan', 'Ahmed', 'Ali'
];

const bios = [
  'Experienced caregiver with a passion for helping others. Specialized in elderly care and post-surgery recovery.',
  'Dedicated to providing compassionate care. 5+ years of experience in medical assistance.',
  'Certified nursing assistant with expertise in dementia care and medication management.',
  'Patient and caring professional with strong communication skills. Background in physical therapy.',
  'Experienced in pediatric care and elderly assistance. Certified in first aid and CPR.',
  'Specialized in post-surgical care and rehabilitation. Compassionate and dedicated.',
  'Expertise in palliative care and end-of-life support. Gentle and understanding.',
  'Skilled in managing chronic conditions and medication schedules. Reliable and punctual.'
];

const avatarUrls = [
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face'
];

const availabilityPatterns = [
  { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
  { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false },
  { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: true, sunday: true },
  { monday: true, tuesday: true, wednesday: false, thursday: true, friday: true, saturday: false, sunday: false },
  { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
];

function randomChoice(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices(arr: any[], count: number) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generatePhone() {
  return `+91${Math.floor(Math.random() * 9000000000 + 6000000000)}`;
}

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustcare';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await CaregiverProfile.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Review.deleteMany({});
    console.log('Cleared existing data');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@trustcare.com',
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face'
    });
    console.log('Created admin user');

    const customers = [];
    for (let i = 0; i < 100; i++) {
      const location = randomChoice(locations);
      customers.push({
        name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
        email: `customer${i + 1}@example.com`,
        password: hashedPassword,
        role: 'CUSTOMER',
        location: {
          lat: location.lat + (Math.random() - 0.5) * 0.5,
          lng: location.lng + (Math.random() - 0.5) * 0.5,
          city: location.city
        },
        phone: generatePhone(),
        avatar: randomChoice(avatarUrls),
        isVerified: true
      });
    }
    const createdCustomers = await User.insertMany(customers);
    console.log(`Created ${createdCustomers.length} customers`);

    const caregivers = [];
    for (let i = 0; i < 50; i++) {
      const location = randomChoice(locations);
      const experienceYears = Math.floor(Math.random() * 15) + 1;
      const baseRating = Math.random() * 2 + 3;
      const rating = Math.round(baseRating * 10) / 10;
      
      const caregiver = {
        name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
        email: `caregiver${i + 1}@example.com`,
        password: hashedPassword,
        role: 'CAREGIVER',
        location: {
          lat: location.lat + (Math.random() - 0.5) * 0.5,
          lng: location.lng + (Math.random() - 0.5) * 0.5,
          city: location.city
        },
        phone: generatePhone(),
        avatar: randomChoice(avatarUrls),
        isVerified: true
      };
      caregivers.push(caregiver);
    }
    const createdCaregivers = await User.insertMany(caregivers);
    console.log(`Created ${createdCaregivers.length} caregivers`);

    const profiles = [];
    for (let i = 0; i < createdCaregivers.length; i++) {
      const user = createdCaregivers[i];
      const experienceYears = Math.floor(Math.random() * 15) + 1;
      const baseRating = Math.random() * 2 + 3;
      const rating = Math.round(baseRating * 10) / 10;
      
      profiles.push({
        caregiverId: user._id,
        hourlyRate: Math.floor(Math.random() * 800) + 200,
        experienceYears,
        skills: randomChoices(skillsList, Math.floor(Math.random() * 5) + 2),
        rating,
        totalReviews: Math.floor(Math.random() * 50) + 5,
        isAvailable: Math.random() > 0.2,
        isVerified: true,
        bio: randomChoice(bios),
        availability: randomChoice(availabilityPatterns)
      });
    }
    const createdProfiles = await CaregiverProfile.insertMany(profiles);
    console.log(`Created ${createdProfiles.length} caregiver profiles`);

    const bookings = [];
    const statuses = ['PENDING', 'ACCEPTED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
    const paymentStatuses = ['PENDING', 'ESCROW', 'PAID_OUT', 'PAID_OUT', 'PAID_OUT', 'REFUNDED'];
    
    for (let i = 0; i < 120; i++) {
      const customer = randomChoice(createdCustomers);
      const caregiver = randomChoice(createdCaregivers);
      const hours = Math.floor(Math.random() * 8) + 2;
      const hourlyRate = randomChoice(createdProfiles).hourlyRate;
      const status = randomChoice(statuses);
      
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 90));
      
      let paymentStatus = 'PENDING';
      if (status === 'COMPLETED') paymentStatus = 'PAID_OUT';
      else if (status === 'ACCEPTED') paymentStatus = 'ESCROW';
      else if (status === 'CANCELLED') paymentStatus = 'REFUNDED';
      
      bookings.push({
        customerId: customer._id,
        caregiverId: caregiver._id,
        date: bookingDate,
        hours,
        status,
        totalAmount: hours * hourlyRate,
        paymentStatus,
        notes: ''
      });
    }
    const createdBookings = await Booking.insertMany(bookings);
    console.log(`Created ${createdBookings.length} bookings`);

    const payments = [];
    for (const booking of createdBookings) {
      if (booking.paymentStatus !== 'PENDING') {
        payments.push({
          bookingId: booking._id,
          transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
          amount: booking.totalAmount,
          status: booking.paymentStatus === 'PAID_OUT' ? 'RELEASED' : 
                  booking.paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'ESCROW',
          paymentMethod: randomChoice(['Credit Card', 'Debit Card', 'UPI', 'Net Banking']),
          customerId: booking.customerId,
          caregiverId: booking.caregiverId
        });
      }
    }
    if (payments.length > 0) {
      await Payment.insertMany(payments);
      console.log(`Created ${payments.length} payments`);
    }

    const reviews = [];
    for (let i = 0; i < 80; i++) {
      const completedBookings = createdBookings.filter(b => b.status === 'COMPLETED');
      const booking = randomChoice(completedBookings);
      
      const rating = Math.floor(Math.random() * 3) + 3;
      const comments = [
        'Excellent service! Very professional and punctual.',
        'Good experience overall. Would recommend.',
        'Very caring and attentive. Made my recovery easier.',
        'Professional and reliable. Will book again.',
        'Average service. Could be more punctual.',
        'Outstanding care! Exceeded expectations.',
        'Very satisfied with the service provided.',
        'Good caregiver but had some scheduling issues.'
      ];
      
      reviews.push({
        bookingId: booking._id,
        customerId: booking.customerId,
        caregiverId: booking.caregiverId,
        rating,
        comment: randomChoice(comments)
      });
    }
    await Review.insertMany(reviews);
    console.log(`Created ${reviews.length} reviews`);

    const totalRevenue = createdBookings
      .filter(b => b.paymentStatus === 'PAID_OUT')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    console.log('\n=== Seed Complete ===');
    console.log(`Admin: admin@trustcare.com / password123`);
    console.log(`Customers: 100 (customer1@example.com - customer100@example.com)`);
    console.log(`Caregivers: 50 (caregiver1@example.com - caregiver50@example.com)`);
    console.log(`Bookings: ${createdBookings.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log(`Reviews: ${reviews.length}`);
    console.log(`Total Revenue: ₹${totalRevenue.toLocaleString()}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
