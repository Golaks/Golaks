<?php
/**
 * Confection App Routes (Konfeksiyon)
 * Program ID: konfeksiyon
 * Endpoint: /apps/confection (İngilizce)
 */

// Reports Routes
$this->get('/apps/confection/reports', 'ConfectionReportsController', 'index');
$this->get('/apps/confection/reports/:id', 'ConfectionReportsController', 'show');
$this->post('/apps/confection/reports', 'ConfectionReportsController', 'create');
$this->put('/apps/confection/reports/:id', 'ConfectionReportsController', 'update');
$this->delete('/apps/confection/reports/:id', 'ConfectionReportsController', 'delete');

// Transactions Routes
$this->get('/apps/confection/transactions', 'ConfectionTransactionsController', 'index');
$this->get('/apps/confection/transactions/:id', 'ConfectionTransactionsController', 'show');
$this->post('/apps/confection/transactions', 'ConfectionTransactionsController', 'create');
$this->put('/apps/confection/transactions/:id', 'ConfectionTransactionsController', 'update');
$this->delete('/apps/confection/transactions/:id', 'ConfectionTransactionsController', 'delete');

// Barcode Query Routes
$this->post('/apps/confection/barcode-query', 'ConfectionBarcodeQueryController', 'query');
