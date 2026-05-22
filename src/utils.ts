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

export const formatWhatsAppPhone = (rawPhone: string): string => {
  let cleaned = rawPhone.replace(/[^\d]/g, ''); // keep only numbers
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
