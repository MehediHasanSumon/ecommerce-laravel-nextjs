<?php

namespace App\Services\Pdf;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class PdfRenderService
{
    public function download(string $view, array $data, string $filename, string $paper = 'a4'): Response
    {
        $pdf = Pdf::loadView($view, $data)
            ->setPaper($paper)
            ->setOption([
                'isRemoteEnabled' => false,
                'isHtml5ParserEnabled' => true,
                'defaultFont' => 'DejaVu Sans',
            ]);

        return $pdf->download($this->normalizeFilename($filename));
    }

    private function normalizeFilename(string $filename): string
    {
        $name = Str::of($filename)->replaceMatches('/[^A-Za-z0-9._-]+/', '-')->trim('-')->toString();

        return str_ends_with($name, '.pdf') ? $name : $name.'.pdf';
    }
}
