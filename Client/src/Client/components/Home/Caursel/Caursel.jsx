import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const Carousel = ({ images: propImages }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Use provided images or fallback to examples
  const images = propImages || [
    {
      src: "https://cdn.pixabay.com/photo/2025/04/24/20/13/landscape-9556563_1280.jpg",
      alt: "First slide",
      caption: "Beautiful landscape image"
    },
    {
      src: "/api/placeholder/800/400",
      alt: "Second slide",
      caption: "City skyline at sunset"
    },
    {
      src: "/api/placeholder/800/400",
      alt: "Third slide",
      caption: "Mountain view"
    }
  ];

  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  const handlePrev = () => {
    setActiveIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const handleDotClick = (index) => {
    setActiveIndex(index);
  };

  return (
    <div className="w-full h-120 mx-auto relative">
      {/* Main carousel container */}
      <div className="relative overflow-hidden rounded-lg h-120">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full" 
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 w-full h-full relative"
            >
              <img 
                src={image.src} 
                alt={image.alt} 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                <p className="text-center">{image.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button 
        onClick={handlePrev} 
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 focus:outline-none"
        aria-label="Previous slide"
      >
        <ArrowLeft size={30} />
      </button>
      
      <button 
        onClick={handleNext} 
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 focus:outline-none"
        aria-label="Next slide"
      >
        <ArrowRight size={30} />
      </button>

      {/* Indicator dots */}
      <div className="flex justify-center mt-20 pt-20">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`h-3 w-3 mx-1 rounded-full focus:outline-none ${
              index === activeIndex ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;