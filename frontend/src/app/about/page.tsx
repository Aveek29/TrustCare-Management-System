'use client';

import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Heart, Shield, Zap, Globe, Mail, Linkedin, Github, Code, Database, Smartphone, Brain, Palette, Lock, CreditCard } from 'lucide-react';

const teamMembers = [
  {
    name: 'Aveek',
    role: 'Creator & Developer',
    description: 'Architect of CareSphere - Built the ML Pipeline, auto-ordering script, and Database Architecture. Passionate about using AI to connect families with perfect caregivers.',
    skills: ['MongoDB', 'ML Pipeline', 'Database Design', 'Express.js', 'System Architecture'],
    icon: Database,
    color: 'from-blue-500 to-cyan-500',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
  },
  {
    name: 'Amisha',
    role: 'Developer',
    description: 'Designed the interactive UI/UX with stunning animations. Expanded the AI Chatbot with comprehensive responses for seamless user support.',
    skills: ['React', 'Framer Motion', 'Tailwind CSS', 'UI/UX Design', 'Chatbot Development'],
    icon: Palette,
    color: 'from-purple-500 to-pink-500',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face'
  },
  {
    name: 'Anushka',
    role: 'Developer',
    description: 'Built the secure Authentication system and Payment Gateway logic. Ensured the Admin Panel has complete control over the platform.',
    skills: ['Authentication', 'JWT', 'Payment Gateway', 'Razorpay', 'Admin Systems'],
    icon: Lock,
    color: 'from-green-500 to-emerald-500',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
  }
];

const contributions = [
  { member: 'Aveek', tasks: ['MongoDB Schema Design', 'ML Recommendation Engine', 'Seed Data Script', 'API Architecture'], color: 'from-blue-500 to-cyan-500' },
  { member: 'Amisha', tasks: ['Interactive UI/UX', 'Framer Motion Animations', 'Responsive Design', 'AI Chatbot Enhancement'], color: 'from-purple-500 to-pink-500' },
  { member: 'Anushka', tasks: ['JWT Authentication', 'Payment Escrow System', 'Admin Dashboard', 'User Management'], color: 'from-green-500 to-emerald-500' }
];

const values = [
  { icon: Heart, title: 'Compassion First', description: 'We believe in the power of care and empathy to transform lives.' },
  { icon: Shield, title: 'Trust & Safety', description: 'Every caregiver is verified, every transaction is secure, every family is protected.' },
  { icon: Zap, title: 'Innovation', description: 'Using cutting-edge ML and AI to create perfect caregiver matches.' },
  { icon: Globe, title: 'Accessibility', description: 'Quality care should be available to everyone, everywhere.' }
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 }
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-5" />
        <div className="absolute top-40 left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative"
        >
          <Badge variant="secondary" className="mb-6 px-4 py-1 text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
            About CareSphere
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
            Connecting Hearts, Building Trust
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            CareSphere is an intelligent caregiver booking platform powered by advanced ML algorithms.
            We connect families with verified, compassionate caregivers who provide exceptional care.
          </p>
        </motion.div>
      </section>

      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white border-0 px-6 py-2">
              Meet The Team
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
              The Bermuda Triangle
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three passionate developers who came together to revolutionize caregiver services
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {teamMembers.map((member, index) => (
              <motion.div key={index} variants={item}>
                <Card className="h-full overflow-hidden group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg">
                  <div className={`h-3 bg-gradient-to-r ${member.color}`} />
                  <CardContent className="p-8">
                    <div className="relative mb-6">
                      <div className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-r ${member.color} p-1`}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-white">
                          <img 
                            src={member.photo} 
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r ${member.color} flex items-center justify-center shadow-lg`}>
                        <member.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    
                    <div className="text-center mt-4">
                      <h3 className="text-2xl font-bold mb-1">{member.name}</h3>
                      <p className={`text-sm font-semibold bg-gradient-to-r ${member.color} bg-clip-text text-transparent mb-3`}>
                        {member.role}
                      </p>
                      <p className="text-muted-foreground text-sm mb-4">{member.description}</p>
                      <div className="flex flex-wrap gap-2 justify-center mb-6">
                        {member.skills.map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-white/50">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-center gap-4 pt-4 border-t">
                      <a href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600 transition-colors">
                        <Linkedin className="h-4 w-4" />
                      </a>
                      <a href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                        <Github className="h-4 w-4" />
                      </a>
                      <a href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="h-4 w-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Project Contributions</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              How each team member contributed to building CareSphere
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {contributions.map((contrib, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-0 shadow-lg overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${contrib.color}`} />
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-4 bg-gradient-to-r ${contrib.color} bg-clip-text text-transparent`}>
                      {contrib.member}
                    </h3>
                    <ul className="space-y-3">
                      {contrib.tasks.map((task, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${contrib.color}`} />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do at CareSphere
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full text-center p-6 hover:shadow-lg transition-shadow border-0 shadow-md">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Powered by <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Innovation</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our platform leverages cutting-edge technology to deliver the best caregiver matching experience.
            From ML-powered recommendations to secure escrow payments, we've thought of everything.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'ML Recommendations', desc: 'Smart matching based on location, skills, and preferences', icon: Brain },
              { title: 'Secure Payments', desc: 'Escrow protection for both families and caregivers', icon: CreditCard },
              { title: 'Verified Profiles', desc: 'Rigorous background checks for your peace of mind', icon: Shield }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 h-full bg-white/50 backdrop-blur-sm border-0 shadow-md">
                  <feature.icon className="h-10 w-10 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Get In Touch</h2>
            <p className="text-lg text-white/80 mb-8">
              Have questions? We'd love to hear from you!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:team@trustcare.com" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors">
                <Mail className="h-5 w-5" />
                team@trustcare.com
              </a>
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
              <span>Built by Bermuda Triangle</span>
              <span>© 2026 CareSphere. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
