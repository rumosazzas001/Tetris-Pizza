"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FiX, FiUser, FiCamera } from "react-icons/fi"; 
import Image from "next/image";
import { useState, useEffect } from "react"; // 2. เพิ่ม useEffect

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: {
    name: string;
    email: string;
    phone?: string;
    profileUrl?: string;
    [key: string]: any;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } }) => void;
  handleSubmit: (e: React.FormEvent, file: File | null) => void;
}

export default function EditProfileModal({
  open,
  onClose,
  profile,
  handleInputChange,
  handleSubmit,
}: EditProfileModalProps) { 
  
  const [imageUrl, setImageUrl] = useState(profile.profileUrl || '');
  // 6. State ใหม่สำหรับเก็บไฟล์ที่เลือก
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState(false);
  // 7. ลบ state ที่ไม่ใช้ออก
  // const [isUrlInputVisible, setIsUrlInputVisible] = useState(false);

  // 8. อัปเดต state เมื่อ profile prop เปลี่ยน (เช่น ปิด/เปิด modal)
  useEffect(() => {
    setImageUrl(profile.profileUrl || '');
    setSelectedFile(null); // Reset ไฟล์ที่เลือก
    setImageError(false);
  }, [profile.profileUrl, open]); // ทำงานใหม่เมื่อ open หรือ profileUrl เปลี่ยน

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http') || url.startsWith('https') || url.startsWith('/');
    } catch {
      return false;
    }
  };

  // 9. ฟังก์ชันนี้ยังใช้ได้ดี สำหรับการแสดงผลครั้งแรก
  const getImageSource = (url: string) => {
    if (!url) return null;
    // เพิ่มเงื่อนไขสำหรับ blob URL (ไฟล์ preview)
    if (url.startsWith('blob:')) return url;
    return isValidUrl(url) ? url : null;
  };

  // 10. ฟังก์ชันใหม่สำหรับจัดการเมื่อผู้ใช้เลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // กัน memory leak: ลบ Object URL เก่า (ถ้ามี)
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
      
      // สร้าง URL ชั่วคราวสำหรับแสดงภาพตัวอย่าง
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);
      setImageError(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-100/60 backdrop-blur-[2px] p-4"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl border border-neutral-200/70 md:p-10"
          >
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-neutral-200/60">
              <h2 className="text-2xl font-black text-neutral-900">
                แก้ไขข้อมูลส่วนตัว
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
            {/* 11. แก้ไข onSubmit ให้ส่ง selectedFile กลับไป */}
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e, selectedFile); // ส่ง file กลับไปด้วย
            }} className="mt-6 space-y-4">

              {/* 12. นี่คือส่วนที่แก้ไขหลัก (Avatar) */}
              <div className="flex flex-col items-center mb-6">
                {/* ซ่อน input file จริง */}
                <input
                  type="file"
                  id="profileUpload"
                  accept="image/*" // จำกัดให้เลือกเฉพาะรูปภาพ
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {/* ใช้ label ครอบรูป Avatar เพื่อให้กดอัปโหลดได้ */}
                <label
                  htmlFor="profileUpload"
                  className="relative w-32 h-32 mb-4 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200 cursor-pointer group"
                  title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
                >
                  {getImageSource(imageUrl) ? (
                    <Image
                      src={imageUrl}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        setImageError(true);
                        (e.target as HTMLImageElement).src = '/default-avatar.png'; // ตรวจสอบว่าคุณมีไฟล์นี้ใน public
                      }}
                      onLoad={() => setImageError(false)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100">
                      <FiUser className="w-12 h-12 text-gray-400" />
                      {imageError && (
                        <span className="text-xs text-red-500 mt-1">ไม่สามารถโหลดรูปภาพได้</span>
                      )}
                    </div>
                  )}
                  {/* เพิ่ม Overlay รูปกล้องสวยๆ */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <FiCamera className="w-8 h-8 text-white" />
                  </div>
                </label>
              </div>
              
              {/* 13. ลบบล็อก <input type="text"> ของ URL รูปภาพเดิมทิ้ง */}
              {/* (ส่วนนี้ถูกลบไปแล้ว) */}
              
              {/* ส่วนที่เหลือของฟอร์ม (ชื่อ, อีเมล, เบอร์โทร) ไม่ต้องแก้ไข */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อจริง-นามสกุล
                </label>
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border border-neutral-300 px-4 py-3 text-[15px] text-neutral-800 placeholder-neutral-400 shadow-sm focus:ring-2 focus:ring-neutral-300 focus:border-neutral-400 outline-none`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border border-neutral-300 px-4 py-3 text-[15px] text-neutral-800 placeholder-neutral-400 shadow-sm focus:ring-2 focus:ring-neutral-300 focus:border-neutral-400 outline-none`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  placeholder="000-000-0000"
                  maxLength={12}
                  className={`w-full rounded-lg border border-neutral-300 px-4 py-3 text-[15px] text-neutral-800 placeholder-neutral-400 shadow-sm focus:ring-2 focus:ring-neutral-300 focus:border-neutral-400 outline-none`}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition"
                >
                  ยกเลิก
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full px-8 py-2.5 text-sm font-semibold text-white bg-[#b21807] hover:bg-[#8e1005] transition-all flex items-center justify-center gap-2"
                >
                  บันทึก
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}