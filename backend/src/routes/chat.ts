import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ChatLog } from '../models/index';
import https from 'https';
import crypto from 'crypto';

const router = Router();

const getSessionId = (req: Request): string => {
  const existingId = req.headers['x-session-id'] as string;
  if (existingId) return existingId;
  return crypto.randomUUID();
};

const getGroqConfig = () => {
  const key = process.env.GROQ_API_KEY;
  const shouldUse = key && !key.startsWith('mock') && key.length > 10;
  console.log(`[Chat Config] GROQ_API_KEY present: ${!!key}, starts with mock: ${key?.startsWith('mock')}, length: ${key?.length}, useGroq: ${shouldUse}`);
  return { key, shouldUse };
};

const mockResponses: Record<string, string[]> = {
  greeting: [
    "Hello! Welcome to CareSphere. How can I help you today?",
    "Hi there! I'm here to help you find the perfect caregiver. What do you need assistance with?",
    "Welcome to CareSphere! I can help you with booking, payments, or any questions about our services.",
    "Hello! I'm your CareSphere assistant. Ready to help you find the right caregiver!"
  ],
  help: [
    "I can help you with: finding caregivers, booking appointments, understanding payments, refunds, verification, and general platform questions. What would you like to know?",
    "Need assistance? I can guide you through our caregiver booking process, explain payment options, help with refunds, or answer any questions about CareSphere."
  ],
  default: [
    "I'd be happy to help you find a caregiver! Browse our caregivers page to see verified professionals. You can filter by skills, rating, and location.",
    "Our booking process is simple: browse caregivers, select one that matches your needs, choose date/time, and complete payment. The caregiver then confirms!",
    "All caregivers go through strict verification including background checks and ID verification. Look for the 'Verified' badge!",
    "Need help? Contact us at support@trustcare.com or call +91-XXX-XXXX-XXXX. We're available 24/7!",
    "We use secure escrow payments - your money is protected until service completion. Admin releases payment after the job is done.",
    "Our ML recommendation system analyzes your location, required skills, and preferences to find the best caregiver match for you!",
    "Caregiver rates: Basic care ₹200-400/hr, Medical assistance ₹400-800/hr, Specialized care ₹600-1200/hr.",
    "Refund policy: 24+ hours before = full refund, 12-24 hours = 50% refund, under 12 hours = no refund.",
    "Our platform has 500+ verified caregivers across major cities. Find the perfect match for your care needs!"
  ],
  booking: [
    "To book a caregiver: 1) Go to Caregivers page, 2) Browse or use ML recommendations, 3) Click View Profile, 4) Select date/time, 5) Complete payment",
    "You can book caregivers from the Caregivers page. Select any caregiver to see their profile, availability, and reviews before booking.",
    "Booking is easy! Just find a caregiver you like, choose your date and time, and complete the payment. Your caregiver will confirm within hours.",
    "You can book multiple sessions with the same caregiver. Simply go to your dashboard and create new bookings."
  ],
  payment: [
    "We accept Credit/Debit Cards, UPI, Net Banking via Razorpay. All payments are held in ESCROW for your protection until service completion.",
    "Payment flow: You pay when booking → Funds held in escrow → Service provided → Admin releases payment to caregiver",
    "Your payment is 100% secure in our escrow system. We only release funds to the caregiver after the service is completed successfully.",
    "Razorpay powers our secure payment gateway. All transactions are encrypted and PCI-DSS compliant."
  ],
  refund: [
    "Refund policy: 24+ hours before service = full refund, 12-24 hours = 50% refund, under 12 hours = no refund. Contact disputes@trustcare.com",
    "For refunds, email disputes@trustcare.com with your booking ID. We process refunds within 5-7 business days.",
    "If you need to cancel, do so at least 24 hours before your booking for a full refund. Late cancellations may incur charges."
  ],
  dispute: [
    "To file a dispute, email disputes@trustcare.com with booking details. Our team responds within 48 hours.",
    "We take complaints seriously. Contact disputes@trustcare.com for any issues with caregivers or service.",
    "If you have any issues with a caregiver, please contact us immediately. Our team will investigate and take appropriate action."
  ],
  caregiver: [
    "Our caregivers offer: Elderly care, child care, medical assistance, post-surgery care, dementia care, and more.",
    "All caregivers are verified with background checks, ID verification, and reference validation. Look for the Verified badge!",
    "Our caregivers are trained professionals with verified backgrounds. They can assist with medical care, elderly support, child care, and more.",
    "Caregivers set their own hourly rates based on experience and skills. Rates range from ₹200 to ₹1200 per hour."
  ],
  verify: [
    "All caregivers undergo: ID verification, criminal background checks, reference validation, and skills assessment.",
    "Caregivers with the Verified badge have passed all our strict verification processes.",
    "Every caregiver on CareSphere is background-checked and verified. Look for the green verification badge on their profile."
  ],
  support: [
    "Contact us: support@trustcare.com | Phone: +91-XXX-XXXX-XXXX | Available 24/7",
    "Our support team is available 24/7. Email support@trustcare.com for general help, disputes@trustcare.com for conflicts.",
    "We're here to help! Reach out to our support team anytime at support@trustcare.com"
  ],
  pricing: [
    "Caregiver pricing varies: Basic elderly/child care ₹200-400/hr, Medical assistance ₹400-800/hr, Specialized care ₹600-1200/hr.",
    "Prices depend on caregiver experience, skills, and the type of care required. You can compare prices on the caregivers page.",
    "We offer competitive pricing with no hidden fees. The price you see is the price you pay!"
  ],
  schedule: [
    "Caregivers have different availability. Check each caregiver's profile for their working days and hours.",
    "You can book caregivers for as little as 1 hour or for extended periods. Choose what works best for your needs.",
    "Most caregivers are available on weekdays. Weekend availability varies by caregiver."
  ],
  location: [
    "We have caregivers in major cities: Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Jaipur, and more!",
    "Our ML system automatically finds caregivers near your location. Just enable location services for the best results.",
    "Caregivers serve multiple areas within cities. Check the distance on each caregiver's profile."
  ],
  reviews: [
    "Read reviews from other families to help choose the right caregiver. Look for consistent positive feedback.",
    "All reviews are from verified customers who have booked and completed services through CareSphere.",
    "High-rated caregivers (4.5+) typically have excellent reviews. Check individual profiles for detailed feedback."
  ],
  onboarding: [
    "To become a caregiver: Register as a caregiver, complete your profile, add skills and availability, and get verified by our team.",
    "Caregivers need to complete verification before accepting bookings. This includes ID verification and background check."
  ]
};

const getMockResponse = (message: string): string => {
  const msg = message.toLowerCase();
  
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('start') || msg.includes('hey there')) {
    return mockResponses.greeting[Math.floor(Math.random() * mockResponses.greeting.length)];
  }
  if (msg.includes('help') || msg.includes('what can you do') || msg.includes('assist')) {
    return mockResponses.help[Math.floor(Math.random() * mockResponses.help.length)];
  }
  if (msg.includes('book') || msg.includes('schedule') || msg.includes('appointment') || msg.includes('reserve') || msg.includes('hire')) {
    return mockResponses.booking[Math.floor(Math.random() * mockResponses.booking.length)];
  }
  if (msg.includes('payment') || msg.includes('pay') || msg.includes('razorpay') || msg.includes('escrow') || msg.includes('price') || msg.includes('cost') || msg.includes('fee')) {
    return mockResponses.payment[Math.floor(Math.random() * mockResponses.payment.length)];
  }
  if (msg.includes('refund') || msg.includes('money back') || msg.includes('cancel')) {
    return mockResponses.refund[Math.floor(Math.random() * mockResponses.refund.length)];
  }
  if (msg.includes('dispute') || msg.includes('complaint') || msg.includes('issue') || msg.includes('problem') || msg.includes('wrong')) {
    return mockResponses.dispute[Math.floor(Math.random() * mockResponses.dispute.length)];
  }
  if (msg.includes('caregiver') || msg.includes('nurse') || msg.includes('attendant') || msg.includes('care') || msg.includes('elderly') || msg.includes('child')) {
    return mockResponses.caregiver[Math.floor(Math.random() * mockResponses.caregiver.length)];
  }
  if (msg.includes('verify') || msg.includes('background') || msg.includes('trusted') || msg.includes('safe') || msg.includes('check')) {
    return mockResponses.verify[Math.floor(Math.random() * mockResponses.verify.length)];
  }
  if (msg.includes('contact') || msg.includes('support') || msg.includes('customer service') || msg.includes('email') || msg.includes('phone')) {
    return mockResponses.support[Math.floor(Math.random() * mockResponses.support.length)];
  }
  if (msg.includes('pricing') || msg.includes('rate') || msg.includes('charges') || msg.includes('expensive') || msg.includes('cheap')) {
    return mockResponses.pricing[Math.floor(Math.random() * mockResponses.pricing.length)];
  }
  if (msg.includes('time') || msg.includes('hour') || msg.includes('available') || msg.includes('weekend') || msg.includes('weekday')) {
    return mockResponses.schedule[Math.floor(Math.random() * mockResponses.schedule.length)];
  }
  if (msg.includes('location') || msg.includes('near') || msg.includes('city') || msg.includes('area') || msg.includes('nearby')) {
    return mockResponses.location[Math.floor(Math.random() * mockResponses.location.length)];
  }
  if (msg.includes('review') || msg.includes('rating') || msg.includes('feedback') || msg.includes('stars')) {
    return mockResponses.reviews[Math.floor(Math.random() * mockResponses.reviews.length)];
  }
  if (msg.includes('become') || msg.includes('register') || msg.includes('apply') || msg.includes('join') || msg.includes('sign up')) {
    return mockResponses.onboarding[Math.floor(Math.random() * mockResponses.onboarding.length)];
  }
  
  return mockResponses.default[Math.floor(Math.random() * mockResponses.default.length)];
};

const LANGUAGE_PROMPTS: Record<string, { system: string; greeting: string; fallback: string }> = {
  en: {
    system: `You are CareSphere AI Assistant - an intelligent, helpful copilot for a caregiver platform.
Context about the user right now:
- They are navigating: {page}
- Role: {role}

You represent CareSphere. Be extremely polite, concise, and helpful. Always respond in English.`,
    greeting: "Hello! Welcome to CareSphere. How can I help you today?",
    fallback: "I'd be happy to help you find a caregiver! Browse our caregivers page to see verified professionals."
  },
  hi: {
    system: `आप CareSphere AI Assistant हैं - एक स्मार्ट, मददगार सहायक जो देखभाल प्रदाता प्लेटफॉर्म के लिए है।
उपयोगकर्ता के बारे में जानकारी:
- वे इस पेज पर हैं: {page}
- भूमिका: {role}

आप CareSphere का प्रतिनिधित्व करते हैं। बहुत विनम्र, संक्षिप्त और मददगार रहें। हमेशा हिंदी में जवाब दें।`,
    greeting: "नमस्ते! CareSphere में आपका स्वागत है। आज मैं आपकी कैसे मदद कर सकता हूं?",
    fallback: "मैं आपको एक देखभाल करने वाला खोजने में मदद करना खुशी होगी! सत्यापित पेशेवरों को देखने के लिए हमारे केयरगिवर पेज पर जाएं।"
  },
  fr: {
    system: `Vous êtes l'assistant IA CareSphere - un copilote intelligent et utile pour une plateforme de soins.
Contexte sur l'utilisateur:
- Ils naviguent sur: {page}
- Rôle: {role}

Vous représentez CareSphere. Soyez extrêmement poli, concis et utile. Répondez toujours en français.`,
    greeting: "Bonjour! Bienvenue sur CareSphere. Comment puis-je vous aider aujourd'hui?",
    fallback: "Je serais ravi de vous aider à trouver un soignant! Visitez notre page soignants pour voir les professionnels vérifiés."
  },
  ru: {
    system: `Вы - ИИ-ассистент CareSphere - интеллектуальный помощник для платформы по уходу.
Контекст о пользователе:
- Они находятся на странице: {page}
- Роль: {role}

Вы представляете CareSphere. Будьте очень вежливы, кратки и полезны. Всегда отвечайте на русском языке.`,
    greeting: "Привет! Добро пожаловать в CareSphere. Чем я могу вам помочь сегодня?",
    fallback: "Буду рад помочь вам найти сиделку! Посетите нашу страницу сиделок, чтобы увидеть проверенных специалистов."
  }
};

const MOCK_RESPONSES: Record<string, Record<string, string[]>> = {
  en: {
    greeting: ["Hello! Welcome to CareSphere. How can I help you today?", "Hi there! I'm here to help you find the perfect caregiver."],
    default: ["I'd be happy to help you find a caregiver!", "Our booking process is simple: browse, select, and pay!"]
  },
  hi: {
    greeting: ["नमस्ते! CareSphere में आपका स्वागत है। आज मैं आपकी कैसे मदद कर सकता हूं?", "नमस्ते! मैं आपकी सहायता के लिए यहां हूं।"],
    default: ["मैं आपको एक देखभाल करने वाला खोजने में मदद करना खुशी होगी!", "बुकिंग प्रक्रिया सरल है: ब्राउज़ करें, चुनें, और भुगतान करें!"]
  },
  fr: {
    greeting: ["Bonjour! Bienvenue sur CareSphere. Comment puis-je vous aider?", "Salut! Je suis là pour vous aider."],
    default: ["Je serais ravi de vous aider à trouver un soignant!", "Le processus de réservation est simple: parcourir, sélectionner et payer!"]
  },
  ru: {
    greeting: ["Привет! Добро пожаловать в CareSphere. Чем я могу вам помочь?", "Здравствуйте! Я здесь, чтобы помочь вам."],
    default: ["Буду рад помочь вам найти сиделку!", "Процесс бронирования прост: просмотр, выбор и оплата!"]
  }
};

router.post('/', async (req: Request, res: Response) => {
  const language = req.body.language || 'en';
  try {
    const { message, history, context } = req.body;
    console.log(`[${new Date().toISOString()}] Chat message received: ${message?.substring(0, 50)}... (lang: ${language})`);

    if (!message || message.trim() === '') {
      const langConfig = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.en;
      return res.json({ reply: langConfig.greeting });
    }

    let reply = '';
    
    const userRole = context?.role || 'GUEST';
    const currentPage = context?.page || 'Home Page';
    const langConfig = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.en;
    
    const { key: groqApiKey, shouldUse: useGroq } = getGroqConfig();
    console.log(`[Chat Debug] useGroq: ${useGroq}, hasKey: ${!!groqApiKey}, keyPrefix: ${groqApiKey?.substring(0, 5)}`);
    if (useGroq && groqApiKey) {
      try {
        const systemPrompt = langConfig.system
          .replace('{page}', currentPage)
          .replace('{role}', userRole);

        const messages = [
          { role: 'system', content: systemPrompt },
          ...(history || []).slice(-10),
          { role: 'user', content: message }
        ];

        const response = await new Promise<string>((resolve, reject) => {
          const data = JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 500
          });

          const req = https.request({
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + groqApiKey
            }
          }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(body);
                if (json.error) {
                  reject(new Error(json.error.message || 'Groq API error'));
                  return;
                }
                if (json.choices && json.choices[0] && json.choices[0].message) {
                  resolve(json.choices[0].message.content);
                } else {
                  reject(new Error('Invalid response format from Groq'));
                }
              } catch (e) {
                reject(new Error('Failed to parse Groq response: ' + body));
              }
            });
          });

          req.on('error', reject);
          req.write(data);
          req.end();
        });

        reply = response;
        console.log(`[${new Date().toISOString()}] Groq response sent successfully`);
      } catch (groqError: any) {
        console.error('Groq error, falling back to mock:', groqError.message);
      }
    }

    if (!reply || reply.trim() === '') {
      const langResponses = MOCK_RESPONSES[language] || MOCK_RESPONSES.en;
      const msg = message.toLowerCase();
      
      if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('नमस्ते') || msg.includes('bonjour') || msg.includes('привет')) {
        reply = langResponses.greeting[Math.floor(Math.random() * langResponses.greeting.length)];
      } else {
        reply = langResponses.default[Math.floor(Math.random() * langResponses.default.length)];
      }
      console.log(`[${new Date().toISOString()}] Fallback mock response sent in ${language}`);
    }

    const sessionId = getSessionId(req);
    const userId = (req as any).user?.id;

    try {
      await ChatLog.findOneAndUpdate(
        { sessionId },
        {
          $setOnInsert: {
            userId: userId || undefined,
            userRole,
            page: currentPage,
            sessionId
          },
          $push: {
            messages: {
              $each: [
                { role: 'user', content: message, timestamp: new Date() },
                { role: 'assistant', content: reply, timestamp: new Date() }
              ]
            }
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (logError) {
      console.error('Failed to save chat log:', logError);
    }

    res.json({ reply, sessionId });
  } catch (error) {
    console.error('Chat error:', error);
    const langConfig = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.en;
    res.json({ reply: langConfig.fallback });
  }
});

export default router;
