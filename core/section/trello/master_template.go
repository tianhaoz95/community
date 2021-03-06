// Copyright 2016 Documize Inc. <legal@documize.com>. All rights reserved.
//
// This software (Documize Community Edition) is licensed under
// GNU AGPL v3 http://www.gnu.org/licenses/agpl-3.0.en.html
//
// You can operate outside the AGPL restrictions by purchasing
// Documize Enterprise Edition and obtaining a commercial license
// by contacting <sales@documize.com>.
//
// https://documize.com

package trello

const renderTemplate = `
{{if eq .Since ""}}
<p>Preparing...</p>
{{else}}
<!-- <p>Activity since {{.Since}} for boards:
{{range $idx, $brd := .Boards}}{{if gt $idx 0}}, {{end}}<a class="link" href="{{$brd.Board.URL}}">{{$brd.Board.OrgName}}/{{$brd.Board.Name}}</a>{{end}}.</p> -->
{{end}}` +
	//labelsTemplate +
	//boardsTemplate +
	//graphsTemplate +
	//membersTemplate +
	//archiveTemplate +
	tradTemplate +
	``
