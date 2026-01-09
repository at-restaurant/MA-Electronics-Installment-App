"use client";

import { useState } from "react";
import { Users, Calendar } from "lucide-react";
import { Storage } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export default function ProfileSelector({
  onSelect,
}: {
  onSelect: (profile: any) => void;
}) {
  const [profiles] = useState(() => {
    const saved = Storage.get("profiles", []);
    if (saved.length === 0) {
      const defaultProfiles = [
        {
          id: 1,
          name: "Main Business",
          description: "Primary business account",
          gradient: "from-blue-500 to-purple-500",
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Side Business",
          description: "Secondary income",
          gradient: "from-green-500 to-teal-500",
          createdAt: new Date().toISOString(),
        },
      ];
      Storage.save("profiles", defaultProfiles);
      return defaultProfiles;
    }
    return saved;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < profiles.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 z-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md relative h-[400px]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {profiles.map((profile, index) => (
            <div
              key={profile.id}
              className={`absolute inset-0 transition-all duration-500 transform ${
                index === currentIndex
                  ? "scale-100 opacity-100 translate-y-0"
                  : index < currentIndex
                    ? "scale-75 opacity-0 -translate-y-full"
                    : "scale-75 opacity-0 translate-y-full"
              }`}
            >
              <div
                onClick={() => onSelect(profile)}
                className="bg-white rounded-3xl p-8 shadow-2xl cursor-pointer hover:scale-105 transition-transform h-full flex flex-col items-center justify-center"
              >
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${profile.gradient} mb-6 flex items-center justify-center shadow-lg`}
                >
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-center mb-3">
                  {profile.name}
                </h2>
                <p className="text-gray-500 text-center text-sm mb-4">
                  {profile.description}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Created {formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-8 text-center text-white">
        <p className="text-sm mb-3 opacity-90">
          👆 Swipe up/down to switch profiles
        </p>
        <div className="flex justify-center gap-2">
          {profiles.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-white w-8" : "bg-white/30 w-2"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
