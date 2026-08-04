import {
  changeAdminPassword,
  describeUserAgent,
  loadAdminProfile,
  saveAdminProfile,
  uploadAdminAvatar,
} from '../logic/ProfilePageLogic';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

export function useProfilePageController() {
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const refresh = async () => {
    try {
      const data = await loadAdminProfile();
      setProfile({
        ...data,
        firstName: data.givenName || data.displayName,
        lastName: data.familyName,
        originalEmail: data.email,
      });
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
      setProfile(null);
    }
  };
  useEffect(() => {
    if (user) void refresh();
  }, [user]);
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await saveAdminProfile(
        {
          givenName: profile.firstName,
          familyName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          bio: profile.bio,
          complete: !profile.profileComplete,
        },
        profile.originalEmail,
      );
      setProfile({
        ...updated,
        firstName: updated.givenName || updated.displayName,
        lastName: updated.familyName,
        originalEmail: updated.email,
      });
      setIsEditing(false);
      toast.success('Profile Updated', 'Your profile information has been saved successfully.');
    } catch (error) {
      toast.error('Update failed', error.message);
    }
  };
  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const updated = await uploadAdminAvatar(file);
      setProfile({
        ...updated,
        firstName: updated.givenName || updated.displayName,
        lastName: updated.familyName,
      });
      toast.success('Profile photo updated', 'Your profile photo is now stored securely.');
    } catch (error) {
      toast.error('Upload failed', error.message);
    } finally {
      event.target.value = '';
    }
  };
  const handlePassword = async () => {
    const password = newPassword;
    if (password.length < 8) {
      toast.error('Password not changed', 'Use at least 8 characters.');
      return;
    }
    try {
      await changeAdminPassword(password);
      setPasswordModal(false);
      setNewPassword('');
      await refresh();
      toast.success('Password updated', 'Your password was changed successfully.');
    } catch (error) {
      toast.error('Password update failed', error.message);
    }
  };
  if (!profile)
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className={`mt-4 ${loadError ? 'text-red-600' : 'text-gray-500'}`}>
          {loadError || 'Loading profile…'}
        </p>
      </div>
    );
  const currentEvent = profile.authenticationEvents[0] ?? null;
  const currentAgent = describeUserAgent(currentEvent?.user_agent ?? window.navigator.userAgent);
  const deviceLabel = (agent) =>
    [agent.device, agent.browser].filter(Boolean).join(' - ');
  return {
    isEditing,
    setIsEditing,
    fileInputRef,
    profile,
    setProfile,
    passwordModal,
    setPasswordModal,
    newPassword,
    setNewPassword,
    handleSave,
    handleAvatar,
    handlePassword,
    currentEvent,
    currentAgent,
    describeUserAgent,
    deviceLabel,
  };
}
