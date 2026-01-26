<?php
/**
 * Account App Routes (Muhasebe)
 * Program ID: muhasebe
 * Endpoint: /apps/account (İngilizce)
 */

// Reports Routes
$this->get('/apps/account/reports', 'AccountReportsController', 'index');
$this->get('/apps/account/reports/:id', 'AccountReportsController', 'show');
$this->post('/apps/account/reports', 'AccountReportsController', 'create');
$this->put('/apps/account/reports/:id', 'AccountReportsController', 'update');
$this->delete('/apps/account/reports/:id', 'AccountReportsController', 'delete');

// Transactions Routes
$this->get('/apps/account/transactions', 'AccountTransactionsController', 'index');
$this->get('/apps/account/transactions/:id', 'AccountTransactionsController', 'show');
$this->post('/apps/account/transactions', 'AccountTransactionsController', 'create');
$this->put('/apps/account/transactions/:id', 'AccountTransactionsController', 'update');
$this->delete('/apps/account/transactions/:id', 'AccountTransactionsController', 'delete');
