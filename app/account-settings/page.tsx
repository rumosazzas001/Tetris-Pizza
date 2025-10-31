"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import SuccessModal from "../components/modals/success/success-modal";
import ErrorModal from "../components/modals/error/error-modal";
import EditProfileModal from "./components/EditProfileModal";
import ChangePasswordModal from "./components/ChangePasswordModal";

const AddressManager = dynamic(() => import("./components/AddressManager"), {
  ssr: false,
});

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  balance?: string;
  profileUrl?: string;
}

interface AddressType {
  address_id: number;
  address_line1: string;
  sub_district: string;
  city: string;
  province: string;
  postal_code: string;
  recipient_name: string;
  phone_number: string;
  address_label: string;
  is_default: boolean;
}

export default function AccountSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [addresses, setAddresses] = useState<AddressType[]>([]);

  const fetchAddresses = async (token: string) => {
    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiBaseUrl}/api/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    }
  };

  // --- 1. สร้างฟังก์ชัน Helper นี้ ---
  // (ฟังก์ชันนี้จะแปลง URL ให้ถูกต้อง)
  const getFullImageUrl = (url: string | undefined | null): string => {
    if (!url) return ""; // ถ้าไม่มี URL ก็คืนค่าว่าง

    // ถ้า URL เป็น URL เต็มแล้ว (เช่น http, https) หรือเป็น blob (รูป preview) ก็ใช้ได้เลย
    if (url.startsWith("http") || url.startsWith("blob:")) {
      return url;
    }

    // ถ้า URL เป็นแบบ Relative (เช่น /uploads/image.jpg)
    if (url.startsWith("/")) {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      return `${apiBaseUrl}${url}`; // ต่อ Base URL เข้าไปข้างหน้า
    }

    return url; // คืนค่าเดิมถ้าไม่เข้าเงื่อนไข
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      router.push("/auth/login");
      return;
    }

    setToken(storedToken);

    const fetchProfile = async () => {
      try {
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
        const response = await fetch(`${apiBaseUrl}/api/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();

        // Format phone number when fetching data
        const formatPhoneNumber = (phone: string) => {
          if (!phone) return "";
          // Remove all non-digit characters
          const cleaned = phone.replace(/\D/g, "");
          // Format as XXX-XXX-XXXX
          return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
        };

        setProfile({
          name: data.fullName || "ผู้ใช้",
          email: data.email || "",
          phone: formatPhoneNumber(data.phoneNumber) || "",
          address: data.address || "",
          // --- 2. แก้ไข `fetchProfile` ---
          profileUrl: getFullImageUrl(data.profileUrl), // <-- ใช้ฟังก์ชันใหม่
        });
      } catch {
        // fallback mock data
        setProfile({
          name: "Emily Johnson",
          email: "johnson@example.com",
          phone: "213-555-1234",
          address: "California - United States",
          profileUrl: "",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    if (storedToken) {
      fetchAddresses(storedToken);
    }
  }, []);

  const defaultAddress = addresses.find((addr) => addr.is_default);
  const formattedDefaultAddress = defaultAddress
    ? `${defaultAddress.address_line1}, ${defaultAddress.sub_district}, ${defaultAddress.city}, ${defaultAddress.province} ${defaultAddress.postal_code}`
    : "ยังไม่มีที่อยู่หลัก";

  const handlePasswordInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setPasswordFields((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmNewPassword } = passwordFields;

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      setShowErrorModal(true);
      return;
    }

    if (!token) return;

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiBaseUrl}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }

      setShowSuccess(true);
      setPasswordFields({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, "");

    // Format the phone number with dashes
    let formatted = "";
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 3);
      if (cleaned.length > 3) {
        formatted += "-" + cleaned.substring(3, 6);
      }
      if (cleaned.length > 6) {
        formatted += "-" + cleaned.substring(6, 10);
      }
    }
    return formatted;
  };

  // --- 4. ลบฟังก์ชัน `handleProfilePictureChange` นี้ทิ้ง (เราไม่ได้ใช้แล้ว) ---
  // const handleProfilePictureChange = (url: string) => {
  //   setProfile(prev => ({
  //     ...prev,
  //     profileUrl: url
  //   }));
  // };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } },
  ) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const formattedPhone = formatPhoneNumber(value);
      setProfile((prev) => ({ ...prev, [name]: formattedPhone }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleExpiredToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    router.push('/auth/login');
  };

  const validateToken = (token: string | null): boolean => {
    if (!token) return false;
    
    const cleanToken = token.replace(/^"|"$/g, '');
    
    const tokenParts = cleanToken.split('.');
    if (tokenParts.length !== 3) return false;
    
    return true;
  };

  // (ฟังก์ชัน handleSave ที่เราแก้ไปแล้ว)
  const handleSave = async (e: React.FormEvent, file: File | null) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token || !validateToken(token)) {
        console.error('Invalid or missing authentication token');
        handleExpiredToken();
        return;
      }
      
      const cleanToken = token.replace(/^"|"$/g, '');

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const apiUrl = `${apiBaseUrl}/auth/update-profile`;

      const formData = new FormData();
      formData.append('fullName', profile.name);
      formData.append('email', profile.email);
      formData.append('phoneNumber', profile.phone?.replace(/\D/g, "") || "");

      if (file) {
        formData.append('profileImage', file);
      }

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
        },
        body: formData 
      });

      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredToken();
          return;
        }
        throw new Error(responseData.message || `Failed to update profile: ${response.statusText}`);
      }

      if (responseData.user) {
        const formattedPhone = formatPhoneNumber(responseData.user.phoneNumber || "");

        setProfile({
          name: responseData.user.fullName || "ผู้ใช้",
          email: responseData.user.email || "",
          phone: formattedPhone,
          address: profile.address,
          // --- 3. แก้ไข `handleSave` ---
          profileUrl: getFullImageUrl(responseData.user.profileUrl), // <-- ใช้ฟังก์ชันใหม่
        });
      }

      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error in handleSave:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#b21807] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="อัปเดตข้อมูลสำเร็จ"
        subtitle="ข้อมูลผู้ใช้ของคุณได้ถูกอัปเดตเรียบร้อยแล้ว"
        primaryHref="#"
        primaryText="ตกลง"
      />
      <ErrorModal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="อัปเดตข้อมูลไม่สำเร็จ"
        subtitle={errorMessage}
      />
      {/* Header */}
      <div className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ตั้งค่าบัญชีผู้ใช้
              </h1>
              <p className="mt-1 text-sm text-gray-700">
                จัดการข้อมูลส่วนตัวและข้อมูลการติดต่อของคุณ
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center w-full">
          <div className="w-full max-w-8xl">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  ข้อมูลผู้ใช้
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-[#b21807] hover:bg-[#8a1305]"
                >
                  แก้ไขข้อมูล
                </button>
              </div>
              
              {/* Profile Image Section - Left Aligned */}
              <div className="px-6 py-6 border-b border-gray-200">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-gray-200">
                      
                      {/* ส่วนนี้จะแสดงผลถูกต้อง เพราะ profile.profileUrl ถูกแก้ให้เป็น URL เต็มแล้ว */}
                      {profile.profileUrl ? (
                        <Image
                          src={profile.profileUrl}
                          alt="Profile"
                          width={128}
                          height={128}
                          className="object-cover w-full h-full"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default-avatar.png';
                          }}
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Mode */}
              <div className="px-6 py-4">
                <dl className="divide-y divide-gray-200">
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">
                      ชื่อจริง-นามสกุล:
                    </dt>
                    <dd className="col-span-2 text-sm text-gray-900">
                      {profile.name}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">
                      อีเมล:
                    </dt>
                    <dd className="col-span-2 text-sm text-gray-900">
                      {profile.email}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">
                      เบอร์โทรศัพท์:
                    </dt>
                    <dd className="col-span-2 text-sm text-gray-900">
                      {profile.phone}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">
                      ที่อยู่:
                    </dt>
                    <dd className="col-span-2 text-sm text-gray-900">
                      {formattedDefaultAddress}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Edit Profile Modal */}
            <EditProfileModal
              open={isEditing}
              onClose={() => setIsEditing(false)}
              profile={profile}
              handleInputChange={handleInputChange}
              handleSubmit={handleSave}
              // --- 4. ลบ Prop นี้ทิ้ง ---
              // onProfilePictureChange={handleProfilePictureChange} 
            />

            {/* Change Password Section */}
            <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  แก้ไขรหัสผ่าน
                </h3>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-[#b21807] hover:bg-[#8a1305]"
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>

            {showChangePasswordModal && (
              <ChangePasswordModal
                open={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
                passwordFields={passwordFields}
                handlePasswordInputChange={handlePasswordInputChange}
                handlePasswordChange={handlePasswordChange}
                showPasswords={showPasswords}
                setShowPasswords={setShowPasswords}
              />
            )}

            {/* Address Manager */}
            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <AddressManager
                addresses={addresses}
                fetchAddresses={() => fetchAddresses(token!)}
                token={token}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}