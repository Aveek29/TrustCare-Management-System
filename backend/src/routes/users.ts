import { Router, Response } from 'express';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { User } from '../models/index';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, location, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { name, phone, location, avatar },
      { returnDocument: 'after' }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/customers', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const customers = await User.find({ role: 'CUSTOMER' }).select('-password');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/caregivers', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const caregivers = await User.find({ role: 'CAREGIVER' }).select('-password');
    res.json(caregivers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
