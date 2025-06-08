import { DELIVERY_STATUSES, DELIVERY_STATUS_LIST, getDeliveryStatusByKey, getDeliveryStatus } from './deliveryStatuses';

describe('Delivery Statuses Configuration', () => {
  describe('DELIVERY_STATUSES Object', () => {
    it('should be a non-empty object', () => {
      expect(DELIVERY_STATUSES).toBeInstanceOf(Object);
      expect(Object.keys(DELIVERY_STATUSES).length).toBeGreaterThan(0);
    });

    it('should have enum-like keys mapping to status objects', () => {
      for (const enumKey in DELIVERY_STATUSES) {
        const status = DELIVERY_STATUSES[enumKey];
        expect(status).toBeInstanceOf(Object);
        expect(status.key).toBeDefined();
        expect(typeof status.key).toBe('string');
      }
    });
  });

  describe('DELIVERY_STATUS_LIST Array', () => {
    it('should be a non-empty array', () => {
      expect(DELIVERY_STATUS_LIST).toBeInstanceOf(Array);
      expect(DELIVERY_STATUS_LIST.length).toBeGreaterThan(0);
    });

    it('should have a length matching the number of keys in DELIVERY_STATUSES', () => {
      expect(DELIVERY_STATUS_LIST.length).toEqual(Object.keys(DELIVERY_STATUSES).length);
    });

    it('should contain objects with required properties and correct types', () => {
      DELIVERY_STATUS_LIST.forEach(status => {
        expect(status).toHaveProperty('key');
        expect(typeof status.key).toBe('string');

        expect(status).toHaveProperty('label');
        expect(typeof status.label).toBe('string');

        expect(status).toHaveProperty('color');
        expect(typeof status.color).toBe('string');
        // MUI colors can be 'default', 'primary', 'secondary', 'error', 'info', 'success', 'warning'
        expect(['default', 'primary', 'secondary', 'error', 'info', 'success', 'warning']).toContain(status.color);


        expect(status).toHaveProperty('step');
        expect(typeof status.step).toBe('number');

        if (status.adminLabel) {
          expect(typeof status.adminLabel).toBe('string');
        }
        if (status.userLabel) {
          expect(typeof status.userLabel).toBe('string');
        }
      });
    });
  });

  describe('getDeliveryStatusByKey', () => {
    it('should return the correct status object for a valid key', () => {
      const confirmedStatus = DELIVERY_STATUS_LIST.find(s => s.key === 'confirmed');
      expect(getDeliveryStatusByKey('confirmed')).toEqual(confirmedStatus);
      expect(getDeliveryStatusByKey('confirmed')?.label).toBe('Confirmée par vous'); // Example specific check
    });

    it('should be case-sensitive for keys', () => {
      expect(getDeliveryStatusByKey('CONFIRMED')).toBeNull(); // Assuming keys are lowercase
    });

    it('should return null for an invalid or unknown key', () => {
      expect(getDeliveryStatusByKey('unknown_status_key')).toBeNull();
    });

    it('should return null if key is null or undefined', () => {
      expect(getDeliveryStatusByKey(null)).toBeNull();
      expect(getDeliveryStatusByKey(undefined)).toBeNull();
    });

    it('should retrieve all statuses from DELIVERY_STATUS_LIST correctly', () => {
      DELIVERY_STATUS_LIST.forEach(statusInList => {
        expect(getDeliveryStatusByKey(statusInList.key)).toEqual(statusInList);
      });
    });
  });

  describe('getDeliveryStatus (by enum-like key)', () => {
    it('should return the correct status object for a valid enum-like key', () => {
      expect(getDeliveryStatus('CONFIRMED')).toEqual(DELIVERY_STATUSES.CONFIRMED);
      expect(getDeliveryStatus('CONFIRMED')?.key).toBe('confirmed');
    });

    it('should be case-sensitive for enum-like keys', () => {
        expect(getDeliveryStatus('confirmed')).toBeNull(); // Enum keys are uppercase
    });

    it('should return null for an invalid or unknown enum-like key', () => {
      expect(getDeliveryStatus('UNKNOWN_STATUS_ENUM')).toBeNull();
    });

    it('should return null if enum-like key is null or undefined', () => {
      expect(getDeliveryStatus(null)).toBeNull();
      expect(getDeliveryStatus(undefined)).toBeNull();
    });

    it('should retrieve all statuses from DELIVERY_STATUSES correctly', () => {
      for (const enumKey in DELIVERY_STATUSES) {
        expect(getDeliveryStatus(enumKey)).toEqual(DELIVERY_STATUSES[enumKey]);
      }
    });
  });
});
