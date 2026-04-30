import React from 'react';

const AnimatedLoader1 = () => {
  return (
    <div className="relative w-24 h-24 rotate-45">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="absolute top-0 left-0 w-7 h-7 m-0.5 animate-square"
          style={{
            background: i % 2 === 0 ? '#0077ff' : '#e1007a',
            animationDelay: `${-1.4285714286 * i}s`,
            borderRadius: '4px'
          }}
        />
      ))}

      <style>{`
        @keyframes square-animation {
          0% {
            left: 0;
            top: 0;
          }
          10.5% {
            left: 0;
            top: 0;
          }
          12.5% {
            left: 32px;
            top: 0;
          }
          23% {
            left: 32px;
            top: 0;
          }
          25% {
            left: 64px;
            top: 0;
          }
          35.5% {
            left: 64px;
            top: 0;
          }
          37.5% {
            left: 64px;
            top: 32px;
          }
          48% {
            left: 64px;
            top: 32px;
          }
          50% {
            left: 32px;
            top: 32px;
          }
          60.5% {
            left: 32px;
            top: 32px;
          }
          62.5% {
            left: 32px;
            top: 64px;
          }
          73% {
            left: 32px;
            top: 64px;
          }
          75% {
            left: 0;
            top: 64px;
          }
          85.5% {
            left: 0;
            top: 64px;
          }
          87.5% {
            left: 0;
            top: 32px;
          }
          98% {
            left: 0;
            top: 32px;
          }
          100% {
            left: 0;
            top: 0;
          }
        }
        
        .animate-square {
          animation: square-animation 10s ease-in-out infinite both;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLoader1;
