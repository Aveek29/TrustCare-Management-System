'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { fetchAPI } from '@/lib/utils';
import { Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const skillsList = [
  'Elderly Care', 'Child Care', 'Medical Care', 'Physical Therapy',
  'Dementia Care', 'Post-Surgery Care', 'Companionship', 'Household Help'
];

interface Profile {
  _id: string;
  hourlyRate: number;
  experienceYears: number;
  skills: string[];
  bio?: string;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
}

export default function CaregiverProfilePage() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hourlyRate: '',
    experienceYears: '',
    skills: [] as string[],
    bio: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await fetchAPI('/caregivers/me');
      setProfile(data);
      setForm({
        hourlyRate: data.hourlyRate?.toString() || '',
        experienceYears: data.experienceYears?.toString() || '',
        skills: data.skills || [],
        bio: data.bio || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await fetchAPI('/caregivers/profile', {
        method: 'POST',
        body: JSON.stringify({
          hourlyRate: parseFloat(form.hourlyRate),
          experienceYears: parseInt(form.experienceYears),
          skills: form.skills,
          bio: form.bio,
        }),
      });
      setProfile(data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your caregiver profile</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  placeholder="25"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Experience (Years)</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={form.experienceYears}
                  onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Tell clients about yourself..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {skillsList.map((skill) => (
                <Badge
                  key={skill}
                  variant={form.skills.includes(skill) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold flex items-center justify-center">
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400 mr-1" />
                {profile.rating?.toFixed(1) || '0.0'}
              </div>
              <div className="text-muted-foreground">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{profile.totalReviews || 0}</div>
              <div className="text-muted-foreground">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">${profile.hourlyRate || 0}</div>
              <div className="text-muted-foreground">Hourly Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
