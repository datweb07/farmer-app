import React from 'react';

const SponsorsSlider = () => {
    const sponsors = [
        { id: 1, name: 'Vinamilk', logo: './assets/images/MUFG_logo.svg.png' },
        { id: 2, name: 'Vietcombank', logo: './assets/images/National_Australia_Bank.svg.png' },
        { id: 3, name: 'BIDV', logo: './assets/images/Nvidia_logo.svg.png' },
        { id: 4, name: 'Vinamilk', logo: './assets/images/VNPT_Logo.svg.png' },
        { id: 5, name: 'BIDV', logo: './assets/images/EPAM_LOGO_Black.png   ' },
        { id: 6, name: 'Katalon', logo: './assets/images/Katalon_Studio_logo.png' },
    ];

    // Nhân đôi list để tạo vòng lặp vô hạn
    const duplicatedSponsors = [...sponsors, ...sponsors];

    return (
        <div className="bg-white border border-gray-200 p-8 mb-8 overflow-hidden">
            {/* Title */}
            <h2 className="font-bold text-2xl text-gray-900 mb-8 text-center">
                Các nhà tài trợ & đối tác chiến lược
            </h2>

            <div className="relative">
                {/* Gradient fade */}
                <div className="absolute left-0 top-0 bottom-0 w-20 md:w-28 bg-gradient-to-r from-white to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-20 md:w-28 bg-gradient-to-l from-white to-transparent z-10" />

                {/* Slider viewport */}
                <div className="overflow-hidden">
                    {/* Slider track */}
                    <div className="slider-track">
                        {duplicatedSponsors.map((sponsor, index) => (
                            <div
                                key={`${sponsor.id}-${index}`}
                                className="flex-shrink-0 mx-4 md:mx-8"
                            >
                                <img
                                    src={sponsor.logo}
                                    alt={sponsor.name}
                                    className="w-32 h-32 md:w-40 md:h-40 lg:w-44 lg:h-44 object-contain"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info */}
            <p className="text-center text-base text-gray-600 mt-8">
                Cùng hơn 50+ đối tác tin tưởng hợp tác phát triển nông nghiệp bền vững
            </p>

            {/* CSS */}
            <style>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .slider-track {
          display: flex;
          width: max-content;
          animation: marquee 20s linear infinite;
          will-change: transform;
        }

        /* Responsive speed */
        @media (max-width: 768px) {
          .slider-track {
            animation-duration: 12s;
          }
        }

        @media (min-width: 1024px) {
          .slider-track {
            animation-duration: 25s;
          }
        }
      `}</style>
        </div>
    );
};

export default SponsorsSlider;
