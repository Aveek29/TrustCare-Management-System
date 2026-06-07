import { Router, Request, Response } from 'express';
import { HealthcareFacility } from '../models/HealthcareFacility';
import { HealthcareProvider } from '../models/HealthcareProvider';

const router = Router();

router.get('/facilities', async (req: Request, res: Response) => {
  try {
    const {
      city, state, speciality, type, search, services,
      minRating, maxRating, sortBy, order,
      lat, lng, radius,
      page = '1', limit = '20',
    } = req.query;
    const query: any = {};

    if (city) query['address.city'] = { $regex: city as string, $options: 'i' };
    if (state) query['address.state'] = { $regex: state as string, $options: 'i' };
    if (services) {
      const svcArr = (services as string).split(',').map(s => s.trim());
      query.services = { $in: svcArr.map(s => new RegExp(s, 'i')) };
    }
    if (speciality) {
      const specArr = (speciality as string).split(',').map(s => s.trim());
      query.specialities = { $in: specArr.map(s => new RegExp(s, 'i')) };
    }
    if (type) {
      const types = (type as string).split(',').map(t => t.trim());
      query.facilityType = types.length === 1 ? types[0] : { $in: types };
    }
    if (minRating) query.rating = { ...query.rating, $gte: parseFloat(minRating as string) };
    if (maxRating) query.rating = { ...query.rating, $lte: parseFloat(maxRating as string) };
    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [
        { name: regex },
        { 'address.city': regex },
        { 'address.state': regex },
        { 'address.full': regex },
        { specialities: regex },
        { services: regex },
      ];
    }

    if (lat && lng && radius) {
      const latNum = parseFloat(lat as string);
      const lngNum = parseFloat(lng as string);
      const radiusKm = parseFloat(radius as string) || 10;
      const degPerKm = 1 / 111.32;
      const latRange = radiusKm * degPerKm;
      const lngRange = radiusKm * degPerKm / Math.cos(latNum * Math.PI / 180);
      query['coordinates.lat'] = { $gte: latNum - latRange, $lte: latNum + latRange };
      query['coordinates.lng'] = { $gte: lngNum - lngRange, $lte: lngNum + lngRange };
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    let sortObj: any = { rating: -1 };
    if (sortBy === 'name') sortObj = { name: order === 'asc' ? 1 : -1 };
    else if (sortBy === 'rating') sortObj = { rating: order === 'asc' ? 1 : -1 };
    else if (sortBy === 'newest') sortObj = { createdAt: -1 };

    const [facilities, total] = await Promise.all([
      HealthcareFacility.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      HealthcareFacility.countDocuments(query),
    ]);

    const distinctCities = await HealthcareFacility.distinct('address.city', { 'address.city': { $ne: '' } });
    const distinctTypes = await HealthcareFacility.distinct('facilityType');

    res.json({
      facilities,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      filters: { cities: distinctCities.slice(0, 50), types: distinctTypes },
    });
  } catch (error) {
    console.error('Get facilities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/facilities/geo/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = '10', page = '1', limit = '20' } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng are required' });

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);
    const degPerKm = 1 / 111.32;
    const pag = Math.max(1, parseInt(page as string));
    const lim = Math.min(100, Math.max(1, parseInt(limit as string)));

    if (isNaN(latNum) || isNaN(lngNum)) return res.status(400).json({ message: 'Invalid coordinates' });

    const minLat = latNum - radiusKm * degPerKm;
    const maxLat = latNum + radiusKm * degPerKm;
    const minLng = lngNum - radiusKm * degPerKm / Math.cos(latNum * Math.PI / 180);
    const maxLng = lngNum + radiusKm * degPerKm / Math.cos(latNum * Math.PI / 180);

    const facilities = await HealthcareFacility.find({
      'coordinates.lat': { $gte: minLat, $lte: maxLat, $ne: 0 },
      'coordinates.lng': { $gte: minLng, $lte: maxLng, $ne: 0 },
    }).sort({ rating: -1 }).skip((pag - 1) * lim).limit(lim).lean();

    res.json({ facilities, pagination: { page: pag, limit: lim, total: facilities.length, pages: Math.ceil(facilities.length / lim) } });
  } catch (error) {
    console.error('Geo search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/facilities/:id', async (req: Request, res: Response) => {
  try {
    const facility = await HealthcareFacility.findById(req.params.id).lean();
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    const providers = await HealthcareProvider.find({ facilityId: req.params.id }).lean();
    res.json({ facility, providers });
  } catch (error) {
    console.error('Get facility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/providers', async (req: Request, res: Response) => {
  try {
    const { city, speciality, facilityId, page = '1', limit = '20' } = req.query;
    const query: any = {};
    if (city) query['address.city'] = { $regex: city as string, $options: 'i' };
    if (speciality) query.specialities = { $in: [speciality as string] };
    if (facilityId) query.facilityId = facilityId;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [providers, total] = await Promise.all([
      HealthcareProvider.find(query).sort({ rating: -1 }).skip(skip).limit(limitNum).lean(),
      HealthcareProvider.countDocuments(query),
    ]);

    res.json({ providers, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/providers/:id', async (req: Request, res: Response) => {
  try {
    const provider = await HealthcareProvider.findById(req.params.id).lean();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json({ provider });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, city, state, type, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (q) {
      const regex = new RegExp(q as string, 'i');
      query.$or = [
        { name: regex },
        { 'address.city': regex },
        { 'address.state': regex },
        { 'address.full': regex },
        { specialities: regex },
        { services: regex },
      ];
    }
    if (city) query['address.city'] = { $regex: city as string, $options: 'i' };
    if (state) query['address.state'] = { $regex: state as string, $options: 'i' };
    if (type) query.facilityType = type;

    const [facilities, facilityTotal] = await Promise.all([
      HealthcareFacility.find(query).sort({ rating: -1 }).skip(skip).limit(limitNum).lean(),
      HealthcareFacility.countDocuments(query),
    ]);

    res.json({ facilities, pagination: { page: pageNum, limit: limitNum, total: facilityTotal, pages: Math.ceil(facilityTotal / limitNum) } });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export { router as publicRouter };
