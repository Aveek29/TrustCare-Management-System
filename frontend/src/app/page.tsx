'use client';

import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Heart, Clock, Star, Search, Users, Award, Brain, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Shield,
    title: 'Verified Caregivers',
    description: 'All caregivers undergo strict background checks and verification',
  },
  {
    icon: Heart,
    title: 'Personalized Care',
    description: 'Find caregivers that match your specific needs and preferences',
  },
  {
    icon: Clock,
    title: 'Flexible Scheduling',
    description: 'Book care on your schedule - hourly, daily, or long-term',
  },
  {
    icon: Star,
    title: 'Reviews & Ratings',
    description: 'Transparent reviews from verified customers to help you decide',
  },
];

const stats = [
  { value: '10K+', label: 'Families Served' },
  { value: '500+', label: 'Verified Caregivers' },
  { value: '4.9', label: 'Average Rating' },
  { value: '24/7', label: 'Support Available' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <Badge variant="secondary" className="mb-6 px-6 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              Trusted by 10,000+ families
            </Badge>
            
            <motion.h1 
              className="text-5xl md:text-8xl font-bold mb-6"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
                CareSphere
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Connect with verified, experienced caregivers who provide compassionate care for your loved ones.
              Book in minutes, trust for life.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link href="/caregivers">
                <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                  <Search className="mr-2 h-5 w-5" />
                  Find a Caregiver
                </Button>
              </Link>
              <Link href="/register?role=caregiver">
                <Button size="lg" variant="outline" className="text-lg px-8 border-2">
                  Become a Caregiver
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div variants={item} key={index} className="text-center">
                <motion.div 
                  className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.1 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-muted-foreground mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              Why Choose Us
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose CareSphere?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We make it easy to find the perfect caregiver for your needs
            </p>
          </motion.div>

          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div variants={item} key={index}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-md">
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-4">
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Getting started with CareSphere is simple
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Search', description: 'Browse our verified caregivers and filter by skills, location, and price', icon: Search },
              { step: '2', title: 'Book', description: 'Select your preferred caregiver, choose your schedule, and complete booking', icon: CreditCard },
              { step: '3', title: 'Relax', description: 'Your caregiver arrives on time, providing professional care your loved ones deserve', icon: Heart },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center relative"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to Find Your Perfect Caregiver?</h2>
            <p className="text-lg text-white/80 mb-8">
              Join thousands of families who trust CareSphere for their caregiving needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/caregivers">
                <Button size="lg" className="text-lg px-8 bg-white text-purple-600 hover:bg-white/90">
                  Get Started
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white/20">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">CareSphere</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-primary">About</Link>
              <Link href="/caregivers" className="hover:text-primary">Caregivers</Link>
              <Link href="/login" className="hover:text-primary">Login</Link>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Contact us: caresphere0029@gmail.com</p>
            <p className="mt-1">© 2026 CareSphere. Built by Bermuda Triangle. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
