import {
  requestCurrentCoordinatesIfPermitted,
  submitCustomerVerification,
  detectSubdivision,
  setMySubdivision,
} from '../logic/AuthVerifyIdentityScreenLogic';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

export function useAuthVerifyIdentityScreenController() {
  const [idType, setIdType] = useState('');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [subdivisionName, setSubdivisionName] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const detect = async (quiet = false) => {
    setDetecting(true);
    try {
      const position = await requestCurrentCoordinatesIfPermitted('balanced');
      if (!position) {
        if (!quiet)
          Alert.alert(
            'Location permission',
            'Choose your subdivision later from your profile.',
          );
        return;
      }
      const subdivision = await detectSubdivision(
        position.latitude,
        position.longitude,
      );
      if (subdivision) {
        await setMySubdivision(subdivision.id);
        setSubdivisionName(subdivision.name);
      } else if (!quiet) {
        Alert.alert(
          'Outside service area',
          'Your location is not inside an active A-YOS subdivision.',
        );
      }
    } catch (error) {
      if (!quiet)
        Alert.alert(
          'Subdivision detection',
          error instanceof Error
            ? error.message
            : 'Unable to detect subdivision',
        );
    } finally {
      setDetecting(false);
    }
  };
  useEffect(() => {
    let active = true;
    void detect(true);
    return () => {
      active = false;
    };
  }, []);
  const submit = async () => {
    if (submitting) return;
    const next: Record<string, string> = {};
    if (!idType) next.idType = 'Select an ID type';
    if (!frontUri) next.front = 'Capture or upload the front of your ID';
    if (!backUri) next.back = 'Capture or upload the back of your ID';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitStatus('Preparing your ID documents…');
    try {
      await submitCustomerVerification(
        {
          idType,
          frontUri: frontUri!,
          backUri: backUri!,
        },
        setSubmitStatus,
      );
      setSubmitStatus('Verification submitted. Redirecting…');
      router.replace('/(tabs)/home');
    } catch (error) {
      setSubmitStatus('');
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to submit verification',
      );
    } finally {
      setSubmitting(false);
    }
  };
  return {
    idType,
    setIdType,
    setFrontUri,
    setBackUri,
    subdivisionName,
    detecting,
    submitting,
    submitStatus,
    submitError,
    errors,
    setErrors,
    detect,
    submit,
    router,
  };
}
