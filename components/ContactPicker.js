import React, { useState } from 'react';
import { FiUser } from 'react-icons/fi';

const ContactPicker = ({ value, onChange, placeholder }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if running in Capacitor mobile environment
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor) {
      const platform = window.Capacitor.getPlatform();
      setIsMobile(platform === 'android' || platform === 'ios');
    }
  }, []);

  const handleContactClick = async () => {
    if (!isMobile) return;

    try {
      // Import only on client-side to avoid SSR issues
      if (typeof window === 'undefined') return;
      const { CapacitorContacts } = await import('@capgo/capacitor-contacts');

      console.log('[ContactPicker] Requesting contacts permission...');
      // Request permissions
      const permissionResult = await CapacitorContacts.requestPermissions();
      console.log('[ContactPicker] Permission result:', permissionResult);

      console.log('[ContactPicker] Fetching contacts...');
      setLoading(true);

      // Get all contacts
      const contactsResult = await CapacitorContacts.getContacts({
        projection: {
          name: true,
          phoneNumbers: true,
        },
      });
      console.log('[ContactPicker] Contacts fetched:', contactsResult);

      const contactsList = contactsResult.contacts || [];
      console.log('[ContactPicker] Total contacts:', contactsList.length);
      console.log('[ContactPicker] First 3 contacts:', contactsList.slice(0, 3).map(c => ({
        id: c.id,
        fullName: c.fullName,
        givenName: c.givenName,
        familyName: c.familyName,
      })));

      // Filter contacts with phone numbers
      const contactsWithPhones = contactsList
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => {
          const name = contact.fullName || contact.givenName || contact.familyName || 'Unknown';
          return {
            id: contact.id,
            name: name,
            phoneNumbers: contact.phoneNumbers.map(phone => ({
              number: phone.value,
              label: phone.type,
            })),
          };
        });

      // Deduplicate by phone number
      const phoneMap = new Map();
      const deduplicatedContacts = [];
      for (const contact of contactsWithPhones) {
        for (const phone of contact.phoneNumbers) {
          const normalizedPhone = phone.number.replace(/\D/g, ''); // Remove non-digits
          if (!phoneMap.has(normalizedPhone)) {
            phoneMap.set(normalizedPhone, true);
            deduplicatedContacts.push({
              id: contact.id,
              name: contact.name,
              phoneNumbers: [phone],
            });
          }
        }
      }

      console.log('[ContactPicker] Deduplicated contacts:', deduplicatedContacts.length);

      setContacts(deduplicatedContacts);
      setFilteredContacts(deduplicatedContacts);
      setShowModal(true);
      setLoading(false);
    } catch (error) {
      console.error('[ContactPicker] Error fetching contacts:', error);
      setLoading(false);
      if (error.message && error.message.includes('permission')) {
        alert('يجب منح إذن الوصول إلى جهات الاتصال');
      } else {
        alert('حدث خطأ أثناء جلب جهات الاتصال');
      }
    }
  };

  const handlePhoneSelect = (phoneNumber) => {
    onChange(phoneNumber);
    setShowModal(false);
    setContacts([]);
    setFilteredContacts([]);
    setSearchQuery('');
  };

  // Filter contacts based on search query
  React.useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phoneNumbers.some(phone => phone.number.includes(query))
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  if (!isMobile) {
    // Web fallback - just show regular input
    return (
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
        placeholder={placeholder}
        style={{ padding: '0.625rem 0.875rem', fontSize: '0.875rem', maxWidth: '300px' }}
      />
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '300px' }}>
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="form-input"
          placeholder={placeholder}
          style={{
            padding: '0.625rem 0.875rem',
            fontSize: '0.875rem',
            flex: '1',
            maxWidth: 'none',
            width: '100%',
          }}
        />
        <button
          type="button"
          onClick={handleContactClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4f46e5',
            transition: 'all 0.2s ease',
            borderRadius: '4px',
            flex: '0 0 auto',
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f3f4f6';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          <FiUser size={36} />
        </button>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            fontFamily: 'Cairo, Almarai, sans-serif',
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: '#1f2937',
              textAlign: 'center',
            }}>
              اختر جهة اتصال
            </h3>
            
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Cairo, Almarai, sans-serif',
              }}
            />
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                جاري تحميل جهات الاتصال...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredContacts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    لا توجد جهات اتصال
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    console.log('[ContactPicker] Rendering contact:', { id: contact.id, name: contact.name });
                    return (
                    <div key={contact.id} style={{ marginBottom: '12px' }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '4px',
                        fontSize: '14px',
                        direction: 'rtl',
                        unicodeBidi: 'plaintext',
                        fontFamily: 'Cairo, Almarai, sans-serif',
                      }}>
                        {contact.name}
                      </div>
                      {contact.phoneNumbers.map((phone, index) => (
                        <button
                          key={index}
                          onClick={() => handlePhoneSelect(phone.number)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'right',
                            fontSize: '13px',
                            fontFamily: 'Cairo, Almarai, sans-serif',
                            transition: 'all 0.2s ease',
                            marginBottom: '4px',
                            direction: 'ltr',
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#e5e7eb';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = '#f3f4f6';
                          }}
                        >
                          {phone.number}
                          {phone.label && (
                            <span style={{ color: '#6b7280', fontSize: '11px', marginRight: '8px' }}>
                              ({phone.label})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    );
                  })
                )}
              </div>
            )}
            
            <button
              onClick={() => {
                setShowModal(false);
                setContacts([]);
                setFilteredContacts([]);
                setSearchQuery('');
              }}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: 'Cairo, Almarai, sans-serif',
                width: '100%',
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactPicker;
