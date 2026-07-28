const Invoice = require('../models/Invoice');

describe('Invoice Model', () => {
  let testUser;

  beforeEach(() => {
    testUser = global.testUser;
  });

  describe('Invoice Creation', () => {
    it('should create an invoice with valid data', async () => {
      const invoiceData = {
        user: testUser._id,
        client: {
          name: 'Client Company',
          email: 'client@example.com',
          address: '123 Client St, City, State 12345'
        },
        items: [
          {
            name: 'Service 1',
            description: 'Description of service 1',
            quantity: 2,
            price: 100,
            total: 200
          },
          {
            name: 'Service 2',
            description: 'Description of service 2',
            quantity: 1,
            price: 50,
            total: 50
          }
        ],
        taxRate: 10,
        discount: 10,
        currency: 'USD',
        status: 'draft',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };

      const invoice = await Invoice.create(invoiceData);

      expect(invoice.user.toString()).toBe(testUser._id.toString());
      expect(invoice.client.name).toBe(invoiceData.client.name);
      expect(invoice.client.email).toBe(invoiceData.client.email);
      expect(invoice.items).toHaveLength(2);
      expect(invoice.subtotal).toBe(250); // 200 + 50
      expect(invoice.taxAmount).toBe(25); // 10% of 250
      expect(invoice.total).toBe(265); // 250 + 25 - 10
      expect(invoice.currency).toBe('USD');
      expect(invoice.status).toBe('draft');
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}$/);
    });

    it('should generate unique invoice numbers automatically', async () => {
      const invoice1 = await Invoice.create({
        user: testUser._id,
        client: { name: 'Client 1', email: 'client1@example.com' },
        items: [{ name: 'Item 1', quantity: 1, price: 100, total: 100 }]
      });

      const invoice2 = await Invoice.create({
        user: testUser._id,
        client: { name: 'Client 2', email: 'client2@example.com' },
        items: [{ name: 'Item 2', quantity: 1, price: 100, total: 100 }]
      });

      expect(invoice1.invoiceNumber).not.toBe(invoice2.invoiceNumber);
      expect(invoice1.invoiceNumber).toMatch(/^INV-\d{6}$/);
      expect(invoice2.invoiceNumber).toMatch(/^INV-\d{6}$/);
    });

    it('should calculate totals correctly', async () => {
      const invoice = await Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [
          { name: 'Item 1', quantity: 2, price: 50, total: 100 },
          { name: 'Item 2', quantity: 3, price: 25, total: 75 }
        ],
        taxRate: 8,
        discount: 15
      });

      expect(invoice.subtotal).toBe(175); // 100 + 75
      expect(invoice.taxAmount).toBe(14); // 8% of 175
      expect(invoice.total).toBe(174); // 175 + 14 - 15
    });

    it('should set default values correctly', async () => {
      const invoice = await Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }]
      });

      expect(invoice.currency).toBe('USD');
      expect(invoice.status).toBe('draft');
      expect(invoice.taxRate).toBe(0);
      expect(invoice.discount).toBe(0);
      expect(invoice.isRecurring).toBe(false);
      expect(invoice.recurringInterval).toBe('monthly');
      expect(invoice.emailReminderSent).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should require user field', async () => {
      await expect(Invoice.create({
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }]
      })).rejects.toThrow(/Invoice validation failed/);
    });

    it('should require client name', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }]
      })).rejects.toThrow(/Client name is required/);
    });

    it('should require client email', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }]
      })).rejects.toThrow(/Client email is required/);
    });

    it('should require at least one item', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: []
      })).rejects.toThrow(/Invoice validation failed/);
    });

    it('should validate item fields', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: '', quantity: -1, price: -10, total: 0 }]
      })).rejects.toThrow(/Invoice validation failed/);
    });

    it('should validate currency enum', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }],
        currency: 'INVALID'
      })).rejects.toThrow(/is not a valid enum value/);
    });

    it('should validate status enum', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }],
        status: 'invalid'
      })).rejects.toThrow(/is not a valid enum value/);
    });

    it('should validate tax rate range', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }],
        taxRate: 150 // Over 100%
      })).rejects.toThrow(/Invoice validation failed/);
    });

    it('should validate discount is not negative', async () => {
      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }],
        discount: -10
      })).rejects.toThrow(/Invoice validation failed/);
    });
  });

  describe('Pre-save Hooks', () => {
    it('should update timestamps on save', async () => {
      const invoice = await Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }]
      });

      const originalUpdatedAt = invoice.updatedAt;

      // Wait a bit and save again
      await new Promise(resolve => setTimeout(resolve, 10));
      invoice.notes = 'Updated notes';
      await invoice.save();

      expect(invoice.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should recalculate totals when items change', async () => {
      const invoice = await Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }]
      });

      expect(invoice.subtotal).toBe(100);
      expect(invoice.total).toBe(100);

      // Add another item
      invoice.items.push({
        name: 'Item 2',
        quantity: 2,
        price: 50,
        total: 100
      });
      await invoice.save();

      expect(invoice.subtotal).toBe(200);
      expect(invoice.total).toBe(200);
    });

    it('should handle tax rate changes', async () => {
      const invoice = await Invoice.create({
        user: testUser._id,
        client: { name: 'Client', email: 'client@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }]
      });

      expect(invoice.total).toBe(100);

      // Add tax
      invoice.taxRate = 10;
      await invoice.save();

      expect(invoice.taxAmount).toBe(10);
      expect(invoice.total).toBe(110);
    });
  });

  describe('Invoice Number Uniqueness', () => {
    it('should enforce unique invoice numbers', async () => {
      await Invoice.create({
        user: testUser._id,
        client: { name: 'Client 1', email: 'client1@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }],
        invoiceNumber: 'CUSTOM-001'
      });

      await expect(Invoice.create({
        user: testUser._id,
        client: { name: 'Client 2', email: 'client2@example.com' },
        items: [{ name: 'Item', quantity: 1, price: 100, total: 100 }],
        invoiceNumber: 'CUSTOM-001'
      })).rejects.toThrow(/E11000 duplicate key error/);
    });
  });
});
