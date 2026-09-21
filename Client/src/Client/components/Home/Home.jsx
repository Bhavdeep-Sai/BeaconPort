import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, BookOpen, Users, Calendar, Award, ChevronRight, Bell, Cloud, Shield, BarChart3, MessageSquare, Check } from 'lucide-react';
import logo from '../../../assets/logo.jpg';
import question from '../../../assets/svg/question.svg';
import ThemeToggle from '../../../components/ui/ThemeToggle';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Function to handle smooth scrolling
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Scroll to section with smooth behavior
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    // Close mobile menu if it's open
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  // Prevent default anchor click behavior
  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    scrollToSection(sectionId);
  };

  const features = [
    {
      title: "Student Management",
      description: "Complete student lifecycle management from admission to graduation.",
      icon: <Users className="w-8 h-8 text-orange-500" />
    },
    {
      title: "Course Management",
      description: "Design, schedule and track courses, assignments and grades.",
      icon: <BookOpen className="w-8 h-8 text-orange-500" />
    },
    {
      title: "Attendance Tracking",
      description: "Real-time attendance monitoring for students and faculty.",
      icon: <Calendar className="w-8 h-8 text-orange-500" />
    },
    {
      title: "Exam Management",
      description: "Schedule exams, generate report cards and analyze performance.",
      icon: <Award className="w-8 h-8 text-orange-500" />
    },
    {
      title: "Communication Tools",
      description: "Integrated messaging between students, faculty and parents.",
      icon: <MessageSquare className="w-8 h-8 text-orange-500" />
    },
    {
      title: "Analytics Dashboard",
      description: "Comprehensive insights for data-driven decision making.",
      icon: <BarChart3 className="w-8 h-8 text-orange-500" />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navigation */}
      <header className="sticky bg-white/95 dark:bg-gray-850/95 shadow-sm dark:shadow-md top-0 z-50 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Beacon <span className='text-orange-500'>Port</span></span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6 items-center font-medium text-base">
            <a
              href="#"
              className="text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Home
            </a>
            <a
              href="#features"
              className="text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
              onClick={(e) => handleNavClick(e, 'features')}
            >
              Features
            </a>
            <a
              href="#contact"
              className="text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
              onClick={(e) => handleNavClick(e, 'contact')}
            >
              Contact
            </a>
            <ThemeToggle size="sm" />
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors cursor-pointer">Login</button>
            <button onClick={() => navigate('/register')} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow hover:from-orange-600 hover:to-red-600 font-semibold transition-all cursor-pointer">Get Started</button>
          </div>

          {/* Mobile Menu Button & ThemeToggle */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition-colors p-1"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="container text-center mx-auto px-6 py-4 flex flex-col space-y-4">
              <a
                href="#"
                className="text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Home
              </a>
              <a
                href="#features"
                className="text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors py-2 cursor-pointer"
                onClick={(e) => handleNavClick(e, 'features')}
              >
                Features
              </a>
              <a
                href="#contact"
                className="text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors py-2 cursor-pointer"
                onClick={(e) => handleNavClick(e, 'contact')}
              >
                Contact
              </a>
              <div className="flex flex-col space-y-2 pt-2">
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-orange-600 dark:text-orange-400 border border-orange-500 rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors">Login</button>
                <button onClick={() => navigate('/register')} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 font-semibold transition-colors">Get Started</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-orange-600 to-amber-500 text-white py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-[1.6rem] text-center sm:text-left sm:text-4xl md:text-5xl font-bold mb-6">Modern Institutions Management Made Simple</h1>
              <p className="text-sm sm:block sm:text-lg mb-8">Streamline your educational institution's administrative processes with our comprehensive management system.</p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <button className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
                  onClick={(e) => handleNavClick(e, 'contact')}
                >
                  Contact Us
                </button>
                <button
                  className="px-6 py-3 bg-transparent border border-white text-white font-medium rounded-md hover:bg-white hover:text-orange-600 transition-colors"
                  onClick={(e) => handleNavClick(e, 'features')}
                >
                  Learn More
                </button>
              </div>
            </div>
            <div className="md:w-1/2 md:p-5">
              <div className="bg-gray-800 p-2 md:p-3 rounded-lg shadow-xl">
                <img
                  src={logo}
                  alt="Dashboard Preview"
                  className="rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Comprehensive Features</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4 max-w-2xl mx-auto">Our platform offers everything you need to manage your educational institution efficiently.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 p-6 rounded-2xl shadow-sm hover:shadow-lg dark:shadow-md dark:hover:shadow-xl transition-all">
                <div className="p-3 bg-orange-500/10 dark:bg-gray-700 rounded-xl inline-block mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-orange-400 mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gray-100/70 dark:bg-gray-850 transition-colors duration-200">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 w-full p-5 lg:p-10 lg:mb-0">
              <img
                src={question}
                alt="System Demo"
              />
            </div>
            <div className="lg:w-1/2 lg:pl-16">
              <h2 className="text-3xl text-center lg:text-left font-bold text-gray-900 dark:text-gray-100 mb-6">Why Choose Our Management System</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900 dark:text-orange-400">User-Friendly Interface</h3>
                    <p className="text-gray-600 dark:text-gray-300">Intuitive design that requires minimal training for staff and faculty.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900 dark:text-orange-400">Cloud-Based Solution</h3>
                    <p className="text-gray-600 dark:text-gray-300">Access your system from anywhere, anytime with secure cloud technology.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900 dark:text-orange-400">Regular Updates</h3>
                    <p className="text-gray-600 dark:text-gray-300">Continuous improvements and new features based on customer feedback.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900 dark:text-orange-400">Dedicated Support</h3>
                    <p className="text-gray-600 dark:text-gray-300">Our support team is available to help you with any questions or issues.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-10 lg:py-14 shadow-md">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to transform your educational institution?</h2>
          <p className="mb-8 max-w-2xl mx-auto opacity-90 text-base sm:text-lg">Join thousands of schools and colleges that have improved their administrative efficiency with our system.</p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button onClick={() => navigate('/register')} className="px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer">
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Get In Touch</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4 max-w-2xl mx-auto">Have questions? Our team is here to help you.</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className='px-6'>
                <form className='flex flex-col'>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-gray-700 dark:text-gray-300 font-medium mb-2 text-sm">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 dark:text-gray-300 font-medium mb-2 text-sm">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm"
                      placeholder="Your email"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="subject" className="block text-gray-700 dark:text-gray-300 font-medium mb-2 text-sm">Subject</label>
                    <input
                      type="text"
                      id="subject"
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm"
                      placeholder="Subject"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="message" className="block text-gray-700 dark:text-gray-300 font-medium mb-2 text-sm">Message</label>
                    <textarea
                      id="message"
                      rows="4"
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm"
                      placeholder="Your message"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-md cursor-pointer"
                  >
                    Send Message
                  </button>
                </form>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl mx-4 sm:rounded-2xl p-6 shadow-sm dark:shadow-lg">
                <h3 className="text-xl font-semibold text-orange-500 dark:text-orange-400 mb-4 text-center py-2">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-gray-900 dark:text-orange-400 font-medium">Address</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">Chittoor, Andhra Pradesh - 517126</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-gray-900 dark:text-orange-400 font-medium">Email</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">bhavdeepsai@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-start mt-4">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.5.509-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.247-.637-.415-1.363-.465-2.428-.047-1.066-.06-1.405-.06-4.122 0-2.717.01-3.056.06-4.122.05-1.065.218-1.79.465-2.428.254-.66.598-1.216 1.153-1.772a4.88 4.88 0 011.772-1.153c.637-.247 1.363-.415 2.428-.465C8.944 2.013 9.283 2 12 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                        <circle cx="16.5" cy="7.5" r="1.5" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-gray-900 dark:text-orange-400 font-medium">Instagram</h4>
                      <a href="https://instagram.com/bhavdeep_sai" target="_blank" rel="noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors text-sm">@bhavdeep_sai</a>
                    </div>
                  </div>

                  <div className="flex items-start mt-4">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-gray-900 dark:text-orange-400 font-medium">LinkedIn</h4>
                      <a href="https://www.linkedin.com/in/bhavdeepsai/" target="_blank" rel="noreferrer" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors text-sm">E. Bhavdeep Sai</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white pt-10 pb-5 transition-colors duration-200">
        <div className="container mx-auto px-6 lg:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-xl font-semibold text-orange-500 mb-2">Beacon <span className='text-gray-900 dark:text-white'>Port</span></h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Simplifying education management for institutions</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-orange-400 mb-4 text-center md:text-right">Quick Links</h4>
              <ul className="space-y-2 flex gap-8 justify-center md:justify-end text-sm">
                <li>
                  <a
                    href="#"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                    onClick={(e) => handleNavClick(e, 'features')}
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                    onClick={(e) => handleNavClick(e, 'contact')}
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <p>© 2026 BeaconPort. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}