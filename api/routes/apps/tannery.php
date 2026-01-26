<?php
/**
 * Tannery App Routes (Tabakhane)
 * Program ID: tabakhane
 * Endpoint: /apps/tannery (İngilizce)
 */

// Reports Routes
$this->get('/apps/tannery/reports', 'TanneryReportsController', 'index');
$this->get('/apps/tannery/reports/:id', 'TanneryReportsController', 'show');
$this->post('/apps/tannery/reports', 'TanneryReportsController', 'create');
$this->put('/apps/tannery/reports/:id', 'TanneryReportsController', 'update');
$this->delete('/apps/tannery/reports/:id', 'TanneryReportsController', 'delete');

// Transactions Routes
$this->get('/apps/tannery/transactions', 'TanneryTransactionsController', 'index');
$this->get('/apps/tannery/transactions/:id', 'TanneryTransactionsController', 'show');
$this->post('/apps/tannery/transactions', 'TanneryTransactionsController', 'create');
$this->put('/apps/tannery/transactions/:id', 'TanneryTransactionsController', 'update');
$this->delete('/apps/tannery/transactions/:id', 'TanneryTransactionsController', 'delete');
