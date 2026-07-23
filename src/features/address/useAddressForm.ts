import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAddressStore } from '@/store/addressStore';
import { useSettingsStore, COUNTRIES, type Country } from '@/store/settingsStore';

export type AddressFormFields = {
  contactName: string;
  phone: string;
  street: string;
  apartment: string;
  province: string;
  city: string;
  postalCode: string;
};

const EMPTY: AddressFormFields = {
  contactName: '',
  phone: '',
  street: '',
  apartment: '',
  province: '',
  city: '',
  postalCode: '',
};

/**
 * Logique du formulaire d'adresse (ajout / édition).
 *
 * Détient l'état des champs, la validation et l'enregistrement (add/update +
 * adresse par défaut). L'écran ne fait que lier les champs à l'UI.
 */
export function useAddressForm(id?: string) {
  const router = useRouter();
  const addresses = useAddressStore((s) => s.addresses);
  const add = useAddressStore((s) => s.add);
  const update = useAddressStore((s) => s.update);
  const setDefault = useAddressStore((s) => s.setDefault);
  const defaultId = useAddressStore((s) => s.defaultId);
  const settingsCountry = useSettingsStore((s) => s.country);

  const editing = id ? addresses.find((a) => a.id === id) : undefined;
  const initialCountry =
    COUNTRIES.find((c) => c.code === (editing?.countryCode ?? settingsCountry)) ?? COUNTRIES[0];

  const [country, setCountry] = useState<Country>(initialCountry);
  const [form, setForm] = useState<AddressFormFields>(
    editing
      ? {
          contactName: editing.contactName,
          phone: editing.phone,
          street: editing.street,
          apartment: editing.apartment ?? '',
          province: editing.province,
          city: editing.city,
          postalCode: editing.postalCode,
        }
      : EMPTY
  );
  const [makeDefault, setMakeDefault] = useState(editing ? defaultId === editing.id : true);

  const setField = (key: keyof AddressFormFields) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const phoneDigits = form.phone.replace(/[^0-9]/g, "");
  const phoneValid = phoneDigits.length >= 6;
  const postalValid = form.postalCode.trim().length >= 3;

  const valid = Boolean(
    form.contactName.trim() &&
      form.phone.trim() &&
      phoneValid &&
      form.street.trim() &&
      form.province.trim() &&
      form.city.trim() &&
      form.postalCode.trim() &&
      postalValid,
  );

  const save = () => {
    if (!valid) return;
    const payload = {
      countryCode: country.code,
      contactName: form.contactName.trim(),
      dialCode: country.dial,
      phone: form.phone.trim(),
      street: form.street.trim(),
      apartment: form.apartment.trim() || undefined,
      province: form.province.trim(),
      city: form.city.trim(),
      postalCode: form.postalCode.trim(),
    };
    if (editing) {
      update(editing.id, payload);
      if (makeDefault) setDefault(editing.id);
    } else {
      add(payload, makeDefault);
    }
    router.back();
  };

  return {
    isEditing: Boolean(editing),
    country,
    setCountry,
    form,
    setField,
    makeDefault,
    setMakeDefault,
    valid,
    phoneValid,
    postalValid,
    save,
  };
}
