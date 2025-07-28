import { useState, useEffect } from 'react';
import { FaStopCircle } from 'react-icons/fa';

const GeneratingIndicator = ({ handleTerminate }) => {
    const [ellipsis, setEllipsis] = useState('...');

    useEffect(() => {
        const interval = setInterval(() => {
            setEllipsis(prev => {
                if (prev === '.') return '..';
                if (prev === '..') return '...';
                return '.';
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            className="group flex items-center gap-2 cursor-pointer transition-all duration-300 bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-5 py-2.5 shadow-lg"
            onClick={handleTerminate}
        >
            <FaStopCircle
                size={20}
                className="text-gray-500 group-hover:text-theme-500 transition-colors duration-300"
            />
            <span className="text-gray-500 text-sm font-medium group-hover:hidden">Generating{ellipsis}</span>
            <span className="text-theme-500 text-sm font-medium hidden group-hover:block">Stop</span>
        </div>
    );
};

export default GeneratingIndicator;