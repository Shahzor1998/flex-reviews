export type PropertyMeta = {
  slug: string;
  name: string;
  location: string;
  headline: string;
  heroImages: string[];
  capacity: {
    guests: number;
    bedrooms: number;
    bathrooms: number;
    beds: number;
  };
  summary: string;
  longDescription: string;
  nightlyRate: number;
  cleaningFee: number;
  checkIn: string;
  checkOut: string;
  highlights: string[];
  amenities: string[];
  policies: { title: string; items: string[] }[];
};

export const PROPERTY_LIBRARY: Record<string, PropertyMeta> = {
  "2b-n1-a-29-shoreditch-heights": {
    slug: "2b-n1-a-29-shoreditch-heights",
    name: "2B N1 A - 29 Shoreditch Heights",
    location: "Shoreditch, East London",
    headline: "Stunning 2 Bed Apartment in Bow - The Flex London",
    heroImages: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1616594039964-94cd3f5d5b40?auto=format&fit=crop&w=1200&q=80",
    ],
    capacity: {
      guests: 5,
      bedrooms: 2,
      bathrooms: 1,
      beds: 3,
    },
    summary:
      "A sun-soaked Shoreditch apartment with curated interiors, leafy views, and direct access to East London's creative scene.",
    longDescription:
      "The open-plan living room pairs warm oak floors with statement mid-century furniture, while the adjoining kitchen is fully equipped for longer stays. Floor-to-ceiling windows open onto Juliette balconies that overlook a quiet residential courtyard, keeping the apartment calm despite its central location. Both bedrooms feature hotel-quality bedding, ample storage, and blackout blinds. Guests love the fast Wi-Fi, self check-in, and being footsteps away from Boxpark, Columbia Road Flower Market, and the Northern line from Old Street.",
    nightlyRate: 285,
    cleaningFee: 95,
    checkIn: "3:00 PM",
    checkOut: "10:00 AM",
    highlights: [
      "Self check-in with smart lock",
      "Dual work-from-home setups",
      "Washer + dryer in apartment",
      "Steps from Shoreditch brunch spots",
    ],
    amenities: [
      "Cable TV",
      "High-speed Wi-Fi",
      "Washer & dryer",
      "Dishwasher",
      "Fully equipped kitchen",
      "Espresso machine",
      "Elevator access",
      "Fresh linens & towels",
      "24/7 guest support",
      "Weekly cleaning available",
      "Hair dryer",
      "Iron & ironing board",
    ],
    policies: [
      {
        title: "Check-in & Check-out",
        items: ["Check-in after 3:00 PM", "Check-out by 10:00 AM", "Self check-in via smart lock"],
      },
      {
        title: "House Rules",
        items: [
          "No smoking anywhere in the building",
          "Please respect quiet hours after 10:00 PM",
          "No parties or events",
          "Pets on request only",
        ],
      },
      {
        title: "Cancellation",
        items: [
          "Full refund for cancellations up to 7 days before arrival",
          "50% refund for cancellations within 7 days",
          "No refund for same-day cancellations",
        ],
      },
    ],
  },
  "old-street-loft-12b": {
    slug: "old-street-loft-12b",
    name: "Old Street Loft - 12B",
    location: "Old Street, London",
    headline: "Industrial Loft with Skyline Views",
    heroImages: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1475856034135-1afc82db536a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1549187774-b4e9b0445b40?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80",
    ],
    capacity: {
      guests: 4,
      bedrooms: 1,
      bathrooms: 1,
      beds: 2,
    },
    summary:
      "A warehouse conversion with original brickwork, soaring ceilings, and designer furnishings just off Old Street roundabout.",
    longDescription:
      "This dramatic loft pairs exposed structural beams with rich textiles and curated art created by local makers. The chef's kitchen features NEFF appliances, while the mezzanine bedroom overlooks the living area and features a bespoke king-size bed. The spa-style bathroom includes a walk-in rainfall shower and underfloor heating. Old Street and Shoreditch High Street stations are moments away, making this apartment a favourite for both remote workers and weekend travellers.",
    nightlyRate: 240,
    cleaningFee: 80,
    checkIn: "3:00 PM",
    checkOut: "10:00 AM",
    highlights: [
      "Floor-to-ceiling industrial windows",
      "Dedicated desk with ultra-fast Wi-Fi",
      "Curated art from local creators",
      "Complimentary artisan coffee bar",
    ],
    amenities: [
      "Smart TV with streaming apps",
      "Sonos sound system",
      "Blazing fast Wi-Fi",
      "Chef-grade cookware",
      "Dishwasher",
      "In-unit washer",
      "Rainfall shower",
      "Luxury toiletries",
      "Hypoallergenic bedding",
      "Laptop-friendly workspace",
      "Climate control",
      "Secure entry",
    ],
    policies: [
      {
        title: "Check-in & Check-out",
        items: ["Check-in from 3:00 PM", "Check-out by 10:00 AM", "Express check-out available"],
      },
      {
        title: "House Rules",
        items: [
          "No smoking",
          "No parties",
          "Please remove shoes inside the loft",
          "Pets are not permitted",
        ],
      },
      {
        title: "Cancellation",
        items: [
          "Full refund up to 14 days before arrival",
          "50% refund up to 5 days before arrival",
          "No refund within 5 days of arrival",
        ],
      },
    ],
  },
};

export function getPropertyMeta(slug: string): PropertyMeta | undefined {
  return PROPERTY_LIBRARY[slug];
}

export function getAllPropertyMeta(): PropertyMeta[] {
  return Object.values(PROPERTY_LIBRARY);
}
