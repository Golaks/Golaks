<?php
/**
 * Account Transactions Controller
 * Handles accounting transactions
 */

require_once dirname(__DIR__, 3) . '/controllers/BaseController.php';

class AccountTransactionsController extends BaseController {

    /**
     * Get all transactions
     * GET /apps/account/transactions
     */
    public function index() {
        $payload = $this->verifyToken();
        $tenantId = $this->getTenantId();

        if (!$tenantId) {
            $this->sendError('Tenant ID required', 'TENANT_REQUIRED', 400);
        }

        // TODO: Implement database query
        $transactions = [
            [
                'id' => 1,
                'type' => 'debit',
                'account' => '100 - Kasa',
                'amount' => 5000,
                'description' => 'Nakit tahsilat',
                'date' => date('Y-m-d'),
                'created_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 2,
                'type' => 'credit',
                'account' => '320 - Satıcılar',
                'amount' => 3000,
                'description' => 'Satıcı ödemesi',
                'date' => date('Y-m-d'),
                'created_at' => date('Y-m-d H:i:s')
            ]
        ];

        $this->sendSuccess($transactions);
    }

    /**
     * Get single transaction
     * GET /apps/account/transactions/:id
     */
    public function show() {
        $payload = $this->verifyToken();
        $tenantId = $this->getTenantId();

        if (!$tenantId) {
            $this->sendError('Tenant ID required', 'TENANT_REQUIRED', 400);
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            $this->sendError('Transaction ID required', 'ID_REQUIRED', 400);
        }

        // TODO: Implement database query
        $transaction = [
            'id' => $id,
            'type' => 'debit',
            'account' => '100 - Kasa',
            'amount' => 5000,
            'description' => 'Nakit tahsilat',
            'date' => date('Y-m-d'),
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->sendSuccess($transaction);
    }

    /**
     * Create new transaction
     * POST /apps/account/transactions
     */
    public function create() {
        $payload = $this->verifyToken();
        $tenantId = $this->getTenantId();

        if (!$tenantId) {
            $this->sendError('Tenant ID required', 'TENANT_REQUIRED', 400);
        }

        $this->validateRequired(['type', 'account', 'amount']);

        // TODO: Implement database insert
        $transaction = [
            'id' => rand(1000, 9999),
            'type' => $this->requestData['type'],
            'account' => $this->requestData['account'],
            'amount' => $this->requestData['amount'],
            'description' => $this->requestData['description'] ?? '',
            'date' => $this->requestData['date'] ?? date('Y-m-d'),
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->sendSuccess($transaction, 'İşlem başarıyla oluşturuldu');
    }

    /**
     * Update transaction
     * PUT /apps/account/transactions/:id
     */
    public function update() {
        $payload = $this->verifyToken();
        $tenantId = $this->getTenantId();

        if (!$tenantId) {
            $this->sendError('Tenant ID required', 'TENANT_REQUIRED', 400);
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            $this->sendError('Transaction ID required', 'ID_REQUIRED', 400);
        }

        // TODO: Implement database update
        $transaction = [
            'id' => $id,
            'type' => $this->requestData['type'] ?? 'debit',
            'account' => $this->requestData['account'] ?? '100 - Kasa',
            'amount' => $this->requestData['amount'] ?? 0,
            'description' => $this->requestData['description'] ?? '',
            'updated_at' => date('Y-m-d H:i:s')
        ];

        $this->sendSuccess($transaction, 'İşlem başarıyla güncellendi');
    }

    /**
     * Delete transaction
     * DELETE /apps/account/transactions/:id
     */
    public function delete() {
        $payload = $this->verifyToken();
        $tenantId = $this->getTenantId();

        if (!$tenantId) {
            $this->sendError('Tenant ID required', 'TENANT_REQUIRED', 400);
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            $this->sendError('Transaction ID required', 'ID_REQUIRED', 400);
        }

        // TODO: Implement database delete

        $this->sendSuccess(null, 'İşlem başarıyla silindi');
    }
}
