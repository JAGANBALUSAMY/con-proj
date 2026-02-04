# Authorization Middleware Usage Reference

The middleware uses a combination of Role-based and Section-based checks. **ADMIN** always bypasses these checks.

## 1. Role-Based Restriction
Use this for endpoints that differ by administrative level (e.g., User Management).

```javascript
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Only ADMINs and MANAGERs can view user lists
router.get('/users', protect, restrictTo('ADMIN', 'MANAGER'), userController.getAll);
```

## 2. Section-Based Restriction (Section Isolation)
Use this for production logs, defect recording, and batch movements.

```javascript
const { protect, restrictToSection } = require('../middleware/authMiddleware');

// Only operators/managers assigned to CUTTING can start a cutting log
router.post('/production/cutting/start', 
  protect, 
  restrictToSection('CUTTING'), 
  productionController.startLog
);

// Endpoints can allow multiple sections (e.g. Quality Check might overlap)
router.post('/quality/log', 
  protect, 
  restrictToSection('QUALITY_CHECK', 'PACKING'), 
  qualityController.logDefect
);
```

## 3. Combined Logic
Most production routes should use both for maximum isolation.

```javascript
// Only a Stitching Manager or Operator can verify a stitching batch
router.put('/batch/:id/verify',
  protect,
  restrictTo('MANAGER', 'OPERATOR'),
  restrictToSection('STITCHING'),
  batchController.verify
);
```

## 🛡️ Enforcement Rules
- **Admin Bypass**: If `req.user.role === 'ADMIN'`, the middleware immediately calls `next()`.
- **JWT Dependencies**: These middlewares rely on the `role` and `sections` fields being present in the JWT issued by `authController.js`.
