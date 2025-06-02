import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import NetworkSwitcher from '../ui/NetworkSwitcher';
import { useWallet } from '../wallet/WalletProvider';
import { useNetwork } from '../../contexts/NetworkContext';

const Navbar = () => {
  const { account, handleLogout, connectWallet } = useWallet();
  const { currentNetwork } = useNetwork();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle scroll events to change navbar style
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navbarClasses = isScrolled
    ? 'px-6 border-b border-[#22AD74]/20 bg-white sticky top-0 z-50 shadow-md w-full transition-all duration-300'
    : 'px-6 sticky top-0 z-50 w-full bg-transparent transition-all duration-300';

  return (
    <header className={navbarClasses}>
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
        <div className="flex items-center">
          <a
            href="https://gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:opacity-90 transition-all duration-300 group"
          >
            <img
              src="/assets/gama-logo.svg"
              alt="GAMA Logo"
              className="h-8 sm:h-9 group-hover:scale-105 transition-transform duration-300"
            />
            <span
              className={`text-xl sm:text-2xl font-bold ${
                isScrolled
                  ? 'text-[#22AD74] bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70'
                  : 'text-white'
              } text-transparent bg-clip-text group-hover:to-[#22AD74] transition-all duration-300`}
            >
              FLIP
            </span>
          </a>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <a
            href="https://roulette.gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isScrolled ? 'text-gray-600' : 'text-white'
            } hover:text-[#22AD74] transition-all duration-300 flex items-center gap-2 font-medium hover:-translate-y-0.5`}
          >
            Roulette
          </a>

          <div
            className={`h-4 w-px ${isScrolled ? 'bg-gray-200' : 'bg-white/30'}`}
          ></div>

          <a
            href="https://diceroll.gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isScrolled ? 'text-gray-600' : 'text-white'
            } hover:text-[#22AD74] transition-all duration-300 flex items-center gap-2 font-medium hover:-translate-y-0.5`}
          >
            Dice
          </a>

          <div
            className={`h-4 w-px ${isScrolled ? 'bg-gray-200' : 'bg-white/30'}`}
          ></div>

          <button
            onClick={() =>
              window.open(
                'https://app.xspswap.finance/#/swap?outputCurrency=0x678adf7955d8f6dcaa9e2fcc1c5ba70bccc464e6',
                '_blank'
              )
            }
            className={`${
              isScrolled ? 'text-gray-600' : 'text-white'
            } hover:text-[#22AD74] transition-all duration-300 flex items-center gap-2 font-medium hover:-translate-y-0.5`}
          >
            Get GAMA
          </button>

          <div
            className={`h-4 w-px ${isScrolled ? 'bg-gray-200' : 'bg-white/30'}`}
          ></div>

          <a
            href="https://gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isScrolled ? 'text-gray-600' : 'text-white'
            } hover:text-[#22AD74] transition-all duration-300 flex items-center gap-2 font-medium hover:-translate-y-0.5`}
          >
            Home
          </a>

          <div
            className={`h-4 w-px ${isScrolled ? 'bg-gray-200' : 'bg-white/30'}`}
          ></div>

          {account ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  isScrolled
                    ? 'bg-[#22AD74]/5 border border-[#22AD74]/20'
                    : 'bg-[#22AD74]/20 backdrop-blur-sm border border-white/20'
                } hover:bg-[#22AD74]/10 transition-all duration-300 flex items-center gap-2`}
              >
                <span
                  className={`font-medium ${isScrolled ? 'text-gray-900' : 'text-gray-900'}`}
                >
                  {account.slice(0, 6)}
                  <span className="opacity-50 mx-0.5">|</span>
                  {account.slice(-4)}
                </span>
                <svg
                  className={`w-4 h-4 ${
                    isScrolled ? 'text-gray-600' : 'text-gray-600'
                  } transition-transform duration-300 ease-in-out ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Enhanced Modern Dropdown Menu */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-white backdrop-blur-md shadow-xl shadow-[#22AD74]/5 border border-[#22AD74]/10 overflow-hidden z-50"
                  >
                    {/* Account Info Section */}
                    <div className="p-4 bg-gradient-to-r from-[#22AD74]/5 to-transparent">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-[#22AD74] font-medium tracking-wide uppercase">
                          Account
                        </div>
                        <div className="px-2 py-0.5 bg-[#22AD74]/10 rounded-full text-xs text-[#22AD74] font-medium">
                          Connected
                        </div>
                      </div>
                      <div className="text-sm font-mono text-gray-600 break-all">
                        {account}
                      </div>
                    </div>

                    {/* Network Section with no border, instead a subtle divider */}
                    <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#22AD74]/10 to-transparent"></div>

                    <div className="p-4">
                      <div className="text-xs text-[#22AD74] mb-2 font-medium tracking-wide uppercase">
                        Network
                      </div>
                      <NetworkSwitcher isInDropdown={true} />
                    </div>

                    {/* Subtle divider instead of border */}
                    <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#22AD74]/10 to-transparent"></div>

                    {/* Actions Section */}
                    <div className="p-4">
                      <button
                        onClick={() => {
                          handleLogout();
                          setDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg flex items-center justify-center gap-2.5 transition-all duration-300 shadow-sm hover:shadow"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Disconnect Wallet
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className={`px-6 py-2 rounded-lg ${
                isScrolled
                  ? 'bg-[#22AD74] text-white'
                  : 'bg-white text-[#22AD74] backdrop-blur-sm'
              } border ${
                isScrolled ? 'border-[#22AD74]/20' : 'border-white/20'
              } hover:bg-opacity-90 transition-all duration-300 flex items-center gap-2`}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
