import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const DEPARTMENTS = [
  'Roads and Infrastructure',
  'Water Supply',
  'Electricity',
  'Sanitation and Waste Management',
  'Public Safety',
  'Street Lighting',
  'Drainage',
  'Other'
];

export const ROLES = ['citizen', 'department_admin', 'super_admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'citizen'
    },
    department: {
      type: String,
      enum: [...DEPARTMENTS, ''],
      default: '',
      validate: {
        validator: function (val) {
          if (this.role === 'department_admin') {
            return DEPARTMENTS.includes(val);
          }
          return true;
        },
        message: 'Department is required for Department Admins'
      }
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    avatarUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  const match = await bcrypt.compare(candidatePassword, this.password);
  if (match) return true;
  if (typeof candidatePassword === 'string' && candidatePassword.trim() !== candidatePassword) {
    return bcrypt.compare(candidatePassword.trim(), this.password);
  }
  return false;
};

// Exclude password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
