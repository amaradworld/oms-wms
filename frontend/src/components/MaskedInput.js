import React, { useState, useRef, useEffect } from 'react';

const masks = {
  phone: {
    placeholder: '98765 43210',
    format: (v) => {
      const digits = v.replace(/\D/g, '').slice(0, 10);
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    },
  },
  gstin: {
    placeholder: '27AAAAA0000A1Z5',
    format: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15),
  },
  pincode: {
    placeholder: '400001',
    format: (v) => v.replace(/\D/g, '').slice(0, 6),
  },
  hsn4: {
    placeholder: '8471',
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
  },
  hsn8: {
    placeholder: '84713010',
    format: (v) => v.replace(/\D/g, '').slice(0, 8),
  },
  time24: {
    placeholder: 'HH:MM',
    format: (v) => {
      const digits = v.replace(/\D/g, '').slice(0, 4);
      if (digits.length <= 2) return digits;
      return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    },
    validate: (v) => {
      const m = v.match(/^(\d{2}):(\d{2})$/);
      if (!m) return false;
      const h = Number(m[1]);
      const min = Number(m[2]);
      return h >= 0 && h <= 23 && min >= 0 && min <= 59;
    },
  },
  digits: {
    placeholder: '',
    format: (v, max) => v.replace(/\D/g, '').slice(0, max || 20),
  },
  alphanumeric: {
    placeholder: '',
    format: (v, max) => v.replace(/[^A-Za-z0-9]/g, '').slice(0, max || 20).toUpperCase(),
  },
};

const MaskedInput = ({
  type = 'text',
  mask,
  max,
  value = '',
  onChange,
  className = '',
  ...rest
}) => {
  const config = masks[mask];
  const [display, setDisplay] = useState(() => (config ? config.format(value, max) : value));
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      setDisplay(config ? config.format(value, max) : value);
      lastValueRef.current = value;
    }
  }, [value, config, max]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const formatted = config ? config.format(raw, max) : raw;
    setDisplay(formatted);
    lastValueRef.current = formatted;
    if (onChange) {
      e.target = { ...e.target, value: formatted };
      onChange(e);
    }
  };

  return (
    <input
      type={type === 'time24' ? 'text' : type}
      value={display}
      onChange={handleChange}
      placeholder={config?.placeholder || rest.placeholder}
      maxLength={config ? undefined : max}
      className={className}
      {...rest}
    />
  );
};

export default MaskedInput;
