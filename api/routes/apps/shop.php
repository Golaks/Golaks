<?php
/**
 * Shop App Routes (Mağaza)
 * Program ID: magaza
 * Endpoint: /apps/shop (İngilizce)
 */

// Reports Routes
$this->get('/apps/shop/reports', 'ShopReportsController', 'index');
$this->get('/apps/shop/reports/:id', 'ShopReportsController', 'show');
$this->post('/apps/shop/reports', 'ShopReportsController', 'create');
$this->put('/apps/shop/reports/:id', 'ShopReportsController', 'update');
$this->delete('/apps/shop/reports/:id', 'ShopReportsController', 'delete');

// Transactions Routes
$this->get('/apps/shop/transactions', 'ShopTransactionsController', 'index');
$this->get('/apps/shop/transactions/:id', 'ShopTransactionsController', 'show');
$this->post('/apps/shop/transactions', 'ShopTransactionsController', 'create');
$this->put('/apps/shop/transactions/:id', 'ShopTransactionsController', 'update');
$this->delete('/apps/shop/transactions/:id', 'ShopTransactionsController', 'delete');
