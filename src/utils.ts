import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (val: number, currency: string = 'COP') => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const getBogotaDateString = (d: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
};

export const getBogotaTimeString = (d: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const formatted = formatter.format(d);
  const match = formatted.match(/(\d{1,2})[\.:](\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const safeHH = hh === '24' ? '00' : hh;
    const mm = match[2];
    return `${safeHH}:${mm}`;
  }
  return formatted.substring(0, 5);
};

export const parseHoraBogota = (rawTime: any): string => {
  if (!rawTime) return '09:30';
  const str = String(rawTime).trim();
  
  if (str.match(/^\d{2}:\d{2}$/)) {
    return str;
  }
  if (str.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return str.substring(0, 5);
  }

  // Handle historic 1899 epoch Bogota timezone shift by formatting the date directly
  if (str.includes('1899')) {
    try {
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Bogota',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return formatter.format(parsedDate);
      }
    } catch (e) {
      console.error('Error handling 1899 timestamp:', e);
    }
  }

  if (str.includes('T')) {
    try {
      const parts = str.split('T');
      const modernDateTStr = '2026-05-22T' + parts[1];
      const parsedDate = new Date(modernDateTStr);
      if (!isNaN(parsedDate.getTime())) {
        return getBogotaTimeString(parsedDate);
      }
    } catch (e) {
      console.error('Error parsing hora with timezone', e);
    }
  }

  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    if (timePart && timePart.length >= 5) {
      return timePart.substring(0, 5);
    }
  }

  return '09:30';
};

export const parseFechaBogota = (rawDate: any): string => {
  if (!rawDate) return getBogotaDateString();
  const str = String(rawDate).trim();

  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return str;
  }

  if (str.includes('1899-12-30')) {
    return getBogotaDateString();
  }

  if (str.includes('T') || !isNaN(Date.parse(str))) {
    try {
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        return getBogotaDateString(parsedDate);
      }
    } catch (e) {
      console.error('Error parsing fecha with timezone', e);
    }
  }

  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  return str;
};

export const formatWhatsAppPhone = (rawPhone: any): string => {
  if (!rawPhone) return '';
  const phoneStr = String(rawPhone);
  let cleaned = phoneStr.replace(/[^\d]/g, ''); // keep only numbers
  // Colombian mobile numbers are 10 digits starting with '3'
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    return '57' + cleaned;
  }
  // If it already starts with '57' and has 12 digits, it is correct
  if (cleaned.startsWith('57') && cleaned.length === 12) {
    return cleaned;
  }
  // Default fallback if it has 10 digits but starts with something else
  if (!cleaned.startsWith('57') && cleaned.length >= 10) {
    return '57' + cleaned.slice(-10);
  }
  return cleaned;
};
