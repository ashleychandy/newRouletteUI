import React from 'react';
import { motion } from 'framer-motion';

const CoinOption = ({ coinSide, selected, onClick, disabled }) => {
  // Colors for different coin sides
  const coinColors = {
    heads: {
      bg: 'from-green-500 to-green-600',
      glow: 'shadow-green-500/20',
      border: 'border-green-400',
      text: 'text-white',
    },
    tails: {
      bg: 'from-green-400 to-green-500',
      glow: 'shadow-green-400/20',
      border: 'border-green-300',
      text: 'text-white',
    },
  };

  const colors = coinSide === 'heads' ? coinColors.heads : coinColors.tails;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={!disabled && { scale: 1.03, y: -2 }}
      whileTap={!disabled && { scale: 0.97 }}
      animate={selected ? { y: -2 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={() => onClick(coinSide)}
      className={`
        relative h-12 rounded-lg
        flex items-center justify-center
        font-medium text-sm
        transition-all duration-200
        border
        ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
            : 'cursor-pointer'
        }
        ${
          !disabled && selected
            ? `bg-gradient-to-r ${colors.bg} ${colors.text} ${colors.border} shadow-lg ${colors.glow}`
            : !disabled &&
              'bg-white/80 text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50/50'
        }
      `}
    >
      {/* Coin display */}
      <div className="flex items-center gap-2 px-4">
        <span className="font-semibold">
          {coinSide === 'heads' ? 'Heads' : 'Tails'}
        </span>
      </div>

      {/* Subtle glow effect when selected */}
      {selected && !disabled && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Processing indicator when disabled */}
      {disabled && selected && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-gray-400/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
};

const NumberSelector = ({ value, onChange, disabled = false }) => {
  const coinOptions = ['heads', 'tails'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-gray-600 text-sm font-medium">
          Choose Side:
        </label>
        {value && (
          <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-600 border border-green-200">
            Selected: {value === 'heads' ? 'Heads' : 'Tails'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {coinOptions.map(coinSide => (
          <CoinOption
            key={coinSide}
            coinSide={coinSide}
            selected={value === coinSide}
            onClick={onChange}
            disabled={disabled}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xs text-gray-500"
      >
        Match your selection with the coin flip to win!
      </motion.div>
    </div>
  );
};

export default NumberSelector;
